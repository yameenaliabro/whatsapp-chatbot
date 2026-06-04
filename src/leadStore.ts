import { getSql } from "./db";

export type LeadSource = "form" | "chat";
export type LeadScore = "hot" | "warm" | "cold";

export interface LeadInput {
  fullName: string;
  company?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  service?: string | null;
  budget?: string | null;
  brief?: string | null;
  hasWebsite?: boolean | null;
  timeline?: string | null;
  source: LeadSource;
}

export interface LeadRecord {
  id: number;
  fullName: string;
  company: string | null;
  whatsappNumber: string | null;
  email: string | null;
  service: string | null;
  budget: string | null;
  brief: string | null;
  hasWebsite: boolean | null;
  timeline: string | null;
  score: LeadScore;
  status: string;
  source: LeadSource;
  createdAt: string;
}

export function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function scoreLead(input: LeadInput): LeadScore {
  const hasClearRequirement = Boolean(input.service && input.brief && input.brief.trim().length > 0);
  if (!hasClearRequirement) {
    return "cold";
  }

  const isJustExploring = input.timeline === "just_exploring";
  const hasDefinedTimeline = Boolean(input.timeline) && !isJustExploring;
  const hasBudget = Boolean(input.budget) && input.budget !== "uncertain" && input.budget !== "just_exploring";

  if (hasBudget && hasDefinedTimeline) {
    return "hot";
  }
  if (isJustExploring || (!hasBudget && !hasDefinedTimeline)) {
    return "cold";
  }
  return "warm";
}

function deriveStatus(score: LeadScore): string {
  if (score === "hot") {
    return "qualified";
  }
  if (score === "warm") {
    return "nurture";
  }
  return "new";
}

function mapRow(row: Record<string, unknown>): LeadRecord {
  return {
    id: Number(row.id),
    fullName: String(row.full_name),
    company: (row.company as string | null) ?? null,
    whatsappNumber: (row.whatsapp_number as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    service: (row.service as string | null) ?? null,
    budget: (row.budget as string | null) ?? null,
    brief: (row.brief as string | null) ?? null,
    hasWebsite: (row.has_website as boolean | null) ?? null,
    timeline: (row.timeline as string | null) ?? null,
    score: row.score as LeadScore,
    status: String(row.status),
    source: row.source as LeadSource,
    createdAt: String(row.created_at),
  };
}

export async function saveLead(input: LeadInput): Promise<LeadRecord> {
  const sql = getSql();
  const score = scoreLead(input);
  const status = deriveStatus(score);

  const rows = await sql`
    INSERT INTO leads
      (full_name, company, whatsapp_number, email, service, budget, brief, has_website, timeline, score, status, source)
    VALUES
      (${input.fullName}, ${input.company ?? null}, ${input.whatsappNumber ?? null}, ${input.email ?? null},
       ${input.service ?? null}, ${input.budget ?? null}, ${input.brief ?? null}, ${input.hasWebsite ?? null},
       ${input.timeline ?? null}, ${score}, ${status}, ${input.source})
    RETURNING id, full_name, company, whatsapp_number, email, service, budget, brief, has_website,
              timeline, score, status, source, created_at
  `;

  return mapRow(rows[0] as Record<string, unknown>);
}

export async function listLeads(): Promise<LeadRecord[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, full_name, company, whatsapp_number, email, service, budget, brief, has_website,
           timeline, score, status, source, created_at
    FROM leads
    ORDER BY created_at DESC
  `;

  return (rows as Record<string, unknown>[]).map(mapRow);
}
