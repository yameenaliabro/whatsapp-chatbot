import "dotenv/config";
import { app } from "./app.js";

const serverPort = Number(process.env.PORT) || 3000;

app.listen(serverPort, () => {
  console.log(`Bird Coders AI agent running at http://localhost:${serverPort}`);
});
