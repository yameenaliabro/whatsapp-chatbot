import OpenAI from "openai";
import { asOptionalString, saveLead, type LeadInput } from "./leadStore";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AgentResult {
  reply: string;
  leadCaptured: boolean;
}

const bookingLink = process.env.BOOKING_LINK || "https://calendly.com/bird-coders/strategy-call";
const chatModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const SYSTEM_PROMPT = `You are the AI Sales Consultant for "Bird Coders", a software development agency.
You chat with website visitors (this also runs on WhatsApp) to understand their needs and book a free consultation.

Services Bird Coders offers:
- Website Development
- Mobile App Development
- Custom Software
- AI Automation
- E-commerce Store
- Digital Marketing

How to behave:
- Greet warmly and use the visitor's name once you know it.
- Ask ONE qualification question at a time, in this order, skipping anything already answered:
  1. Which service are they interested in?
  2. A brief description of their project.
  3. Do they already have a website or business?
  4. Their expected timeline (within 1 week / 2-3 weeks / just exploring).
  5. Their estimated budget (under $500 / $500-$1,500 / $1,500-$5,000 / $5,000+).
- Keep messages short, friendly and conversational, WhatsApp style. Occasional emoji is fine.

Once you know their service, project brief, timeline and budget, call the capture_lead tool to save them.

After the lead is saved, act on the "score" returned by the tool:
- "hot": Tell them it looks like a great fit and share this booking link: ${bookingLink}
- "warm": Offer to share Bird Coders' portfolio, case studies and success stories, and offer the booking link if they want.
- "cold": Stay helpful and friendly, invite them to reach out whenever they are ready. Do not push.

Answer FAQs concisely:
- Pricing: Depends on scope; most projects start from $500 and are finalised after understanding requirements.
- Timeline: Most websites are completed within 2-6 weeks depending on complexity.
- Payment: Milestone-based, with an initial advance before the project begins.
- Support: Yes, ongoing support and maintenance options are available.
- Portfolio: Yes, happy to share recent projects and case studies.

If the visitor asks for a custom quotation, a call or a meeting, has a large budget, or shows strong buying intent,
reassure them that a Bird Coders consultant will personally review their project and contact them shortly.

Never invent specific prices, dates or promises beyond what is written above.`;

const captureLeadTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "capture_lead",
    description:
      "Save a qualified lead. Call this as soon as you know the visitor's name, the service they want, a project brief, their timeline and their budget.",
    parameters: {
      type: "object",
      properties: {
        fullName: { type: "string", description: "Visitor's full name" },
        company: { type: "string", description: "Company name if mentioned" },
        whatsappNumber: { type: "string", description: "WhatsApp or phone number if shared" },
        email: { type: "string", description: "Email if shared" },
        service: {
          type: "string",
          description: "The service they are interested in",
        },
        projectBrief: { type: "string", description: "Short description of their project" },
        hasWebsite: { type: "boolean", description: "Whether they already have a website/business" },
        timeline: {
          type: "string",
          enum: ["within_1_week", "2_3_weeks", "just_exploring"],
        },
        budget: {
          type: "string",
          enum: ["under_500", "500_1500", "1500_5000", "5000_plus", "uncertain"],
        },
      },
      required: ["fullName", "service", "projectBrief", "timeline", "budget"],
    },
  },
};

export function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const hasValidRole = candidate.role === "user" || candidate.role === "assistant";
  const hasValidContent = typeof candidate.content === "string" && candidate.content.trim().length > 0;
  return hasValidRole && hasValidContent;
}

function parseLeadArguments(rawArguments: string): LeadInput {
  const parsed = JSON.parse(rawArguments) as Record<string, unknown>;
  const fullName = asOptionalString(parsed.fullName);

  if (!fullName) {
    throw new Error("capture_lead was called without a valid fullName.");
  }

  return {
    fullName,
    company: asOptionalString(parsed.company),
    whatsappNumber: asOptionalString(parsed.whatsappNumber),
    email: asOptionalString(parsed.email),
    service: asOptionalString(parsed.service),
    budget: asOptionalString(parsed.budget),
    brief: asOptionalString(parsed.projectBrief),
    hasWebsite: typeof parsed.hasWebsite === "boolean" ? parsed.hasWebsite : null,
    timeline: asOptionalString(parsed.timeline),
    source: "chat",
  };
}

export async function runAgent(conversation: ChatMessage[]): Promise<AgentResult> {
  if (!openaiClient) {
    throw new Error("OPENAI_API_KEY is not set. Add it to your .env file before chatting.");
  }

  const conversationMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = conversation.map(
    (message) => ({ role: message.role, content: message.content })
  );

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationMessages,
  ];

  const firstResponse = await openaiClient.chat.completions.create({
    model: chatModel,
    messages,
    tools: [captureLeadTool],
    tool_choice: "auto",
  });

  const firstMessage = firstResponse.choices[0]?.message;
  const toolCalls = firstMessage?.tool_calls ?? [];

  if (!firstMessage || toolCalls.length === 0) {
    return {
      reply: firstMessage?.content?.trim() || "Sorry, I didn't catch that. Could you say it again?",
      leadCaptured: false,
    };
  }

  const followUpMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [...messages, firstMessage];
  let leadCaptured = false;

  for (const toolCall of toolCalls) {
    if (toolCall.type !== "function" || toolCall.function.name !== "capture_lead") {
      continue;
    }

    const leadInput = parseLeadArguments(toolCall.function.arguments);
    const savedLead = await saveLead(leadInput);
    leadCaptured = true;

    followUpMessages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify({ saved: true, score: savedLead.score, bookingLink }),
    });
  }

  const secondResponse = await openaiClient.chat.completions.create({
    model: chatModel,
    messages: followUpMessages,
  });

  return {
    reply: secondResponse.choices[0]?.message?.content?.trim() || "Thanks! I've noted your details.",
    leadCaptured,
  };
}
