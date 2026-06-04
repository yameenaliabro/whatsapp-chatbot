import { Router, type Request, type Response } from "express";
import { asOptionalString, listLeads, saveLead } from "../leadStore.js";

export const leadsRouter = Router();

leadsRouter.get("/", async (_request: Request, response: Response): Promise<void> => {
  try {
    const leads = await listLeads();
    response.json({ leads });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error loading leads.";
    console.error("Failed to load leads:", errorMessage);
    response.status(500).json({ error: errorMessage });
  }
});

leadsRouter.post("/", async (request: Request, response: Response): Promise<void> => {
  try {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const fullName = asOptionalString(body.fullName);

    if (!fullName) {
      response.status(400).json({ error: "fullName is required." });
      return;
    }

    const lead = await saveLead({
      fullName,
      company: asOptionalString(body.company),
      whatsappNumber: asOptionalString(body.whatsappNumber),
      email: asOptionalString(body.email),
      service: asOptionalString(body.service),
      budget: asOptionalString(body.budget),
      brief: asOptionalString(body.brief),
      hasWebsite: typeof body.hasWebsite === "boolean" ? body.hasWebsite : null,
      timeline: asOptionalString(body.timeline),
      source: "form",
    });

    response.status(201).json({ lead });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error saving lead.";
    console.error("Failed to save lead:", errorMessage);
    response.status(500).json({ error: errorMessage });
  }
});
