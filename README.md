# Bird Coders — AI Sales Agent

An OpenAI-powered AI sales agent (Node.js + Express + TypeScript) that captures website
leads, qualifies them, scores them Hot/Warm/Cold, answers FAQs, and shares a booking link.
Leads are stored in **Neon Postgres** (not a file) so it deploys cleanly to **Vercel**, whose
filesystem is read-only. A WhatsApp Cloud API webhook can be added later without changing the
core logic.

## Why Postgres instead of a JSON file

Vercel runs serverless functions with a **read-only filesystem** (`/tmp` is the only writable
path and it is wiped between requests). Writing `leads.json` there would lose every lead. A
hosted database (Neon) is the correct store and powers the leads dashboard.

## Stack

- **Node.js + Express + TypeScript** — lean, webhook-ready, fully typed (no `any`)
- **OpenAI** — runs the sales agent and captures leads via tool-calling
- **Neon Postgres** — serverless Postgres for lead storage
- **Static HTML pages** — chat, lead form, and leads dashboard

## Pages

| Path          | Purpose                                            |
| ------------- | -------------------------------------------------- |
| `/`           | WhatsApp-style chat with the AI sales agent        |
| `/lead.html`  | Lead capture form (Step 1 fields)                  |
| `/leads.html` | Leads dashboard — reads captured leads from Neon   |

## Project structure

```
whatsapp-chatbot/
├── src/
│   ├── app.ts             # Express app (shared by local server + Vercel)
│   ├── server.ts          # Local dev: starts the HTTP server
│   ├── db.ts              # Neon client (lazy, typed)
│   ├── run-migrations.ts  # CREATE TABLE + ADD COLUMN IF NOT EXISTS (schema lives here only)
│   ├── leadStore.ts       # Lead types, scoreLead(), saveLead(), listLeads()
│   ├── openai.ts          # AI sales agent + capture_lead tool
│   └── routes/
│       ├── chat.ts        # POST /api/chat
│       └── leads.ts       # GET + POST /api/leads
├── api/
│   └── index.ts           # Vercel serverless entry (exports the Express app)
├── public/                # index.html, lead.html, leads.html
├── vercel.json
└── package.json
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a free Neon database at https://neon.tech and copy its connection string.
3. Copy `.env.example` to `.env` and fill it in:
   ```
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   DATABASE_URL=postgresql://user:password@your-neon-host/neondb?sslmode=require
   BOOKING_LINK=https://calendly.com/your-company
   PORT=3000
   ```
4. Create the `leads` table:
   ```bash
   npm run migrate
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000 — chat, or submit the lead form, then view `/leads.html`.

## Lead scoring

`scoreLead()` follows the spec:

- **Hot** — clear requirement + a real budget + a defined timeline → share the booking link
- **Warm** — clear requirement but budget uncertain → share portfolio / case studies
- **Cold** — just exploring / no budget → nurture, no pressure

## API

`POST /api/chat` → `{ messages: [{ role, content }] }` → `{ reply, leadCaptured }`
`POST /api/leads` → form fields (`fullName` required) → `{ lead }`
`GET  /api/leads` → `{ leads: [...] }`

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. In **Project Settings → Environment Variables**, add `OPENAI_API_KEY`, `OPENAI_MODEL`,
   `DATABASE_URL`, and `BOOKING_LINK`.
3. Deploy. `vercel.json` routes `/api/*` to the Express app at `api/index.ts`; the pages in
   `public/` are served as static assets.
4. Run the migration once against your Neon database (locally with the production
   `DATABASE_URL`, or via the Neon SQL editor).

## Adding WhatsApp later

WhatsApp Cloud API needs a GET verify endpoint and a POST webhook. Add `src/routes/whatsapp.ts`
that receives messages, calls the existing `runAgent()` from `src/openai.ts`, and replies via
the WhatsApp Graph API. The agent, scoring, and storage stay unchanged.
