// One command: start the seller, let the AgentKit agent pay it once, then stop.
import "./env.mjs";
import { runAgent } from "./agent.mjs";
import { startSeller } from "./seller.mjs";

const { server, url } = await startSeller(0);
try {
  await runAgent(url);
} finally {
  server.close();
}
