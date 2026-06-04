import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chatRouter } from "./routes/chat.js";
import { leadsRouter } from "./routes/leads.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(currentDirectory, "..", "public");

export const app = express();

app.use(express.json());
app.use(express.static(publicDirectory));
app.use("/api/chat", chatRouter);
app.use("/api/leads", leadsRouter);
