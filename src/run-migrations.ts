import "dotenv/config";
import { getSql } from "./db";

async function runMigrations(): Promise<void> {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_number TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS service TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS brief TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_website BOOLEAN`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS timeline TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS score TEXT NOT NULL DEFAULT 'cold'`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'form'`;
}

runMigrations()
  .then(() => {
    console.log("Migrations completed.");
    process.exit(0);
  })
  .catch((error) => {
    const errorMessage = error instanceof Error ? error.message : "Unknown migration error.";
    console.error("Migration failed:", errorMessage);
    process.exit(1);
  });
