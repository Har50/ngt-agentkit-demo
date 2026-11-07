// An API that charges AI agents per call in NGT on Base (x402).
// With FACILITATOR_KEY set it settles on Base for real. Without it, settlement is
// simulated in memory and nothing goes on-chain; every response says so.
import "./env.mjs";
import { createServer } from "node:http";
import { ngtPaywall } from "@ngtchain/paywall";

const live = Boolean(process.env.FACILITATOR_KEY);
const payTo = process.env.SELLER_PAY_TO || "0x1111111111111111111111111111111111111111";
const price = process.env.PRICE_NGT || "0.001";
const port = Number(process.env.PORT || 4021);

const simulated = {
  settle: async (authorization) => {
    console.log(`[seller] SIMULATED settlement from ${authorization.from}. Nothing was sent to Base.`);
    return { transaction: "simulated" };
  },
};

const gate = ngtPaywall({
  payTo,
  price,
  description: "One market snapshot",
  ...(live
    ? { facilitatorKey: process.env.FACILITATOR_KEY, rpcUrl: process.env.BASE_RPC_URL }
    : { facilitator: simulated }),
});

export function startSeller(listenPort = port) {
  const server = createServer((req, res) => {
    if (!req.url?.startsWith("/v1/snapshot")) {
      res.writeHead(404).end();
      return;
    }
    gate(req, res, () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          snapshot: { pair: "ETH/USD", source: "demo", at: new Date().toISOString() },
          paidBy: req.ngtPayment?.payer,
          mode: live ? "live" : "simulated",
        }),
      );
    });
  });
  return new Promise((resolve) =>
    server.listen(listenPort, "127.0.0.1", () => {
      const url = `http://127.0.0.1:${server.address().port}/v1/snapshot`;
      console.log(`[seller] ${live ? "LIVE on Base" : "SIMULATED (no on-chain settlement)"}: ${url}  price ${price} NGT -> ${payTo}`);
      resolve({ server, url });
    }),
  );
}

if (process.argv[1]?.endsWith("seller.mjs")) {
  await startSeller();
}
