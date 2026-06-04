import { Router, type Request, type Response } from "express";
import { runAgent, isChatMessage } from "../openai.js";

export const chatRouter = Router();

chatRouter.post("/", async (request: Request, response: Response): Promise<void> => {
  try {
    const requestBody = request.body as { messages?: unknown };
    const incomingMessages = Array.isArray(requestBody.messages) ? requestBody.messages : [];
    const validMessages = incomingMessages.filter(isChatMessage);

    if (validMessages.length === 0) {
      response.status(400).json({
        error: "Request body must include a non-empty 'messages' array of { role, content }.",
      });
      return;
    }

    const result = await runAgent(validMessages);
    response.json({ reply: result.reply, leadCaptured: result.leadCaptured });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error generating reply.";
    console.error("Failed to generate chat reply:", errorMessage);
    response.status(500).json({ error: errorMessage });
  }
});
