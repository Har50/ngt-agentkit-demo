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
// PORT is the preferred port. If it is taken, the next free one up to this many above it is used.
const MAX_PORT_TRIES = 20;

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

export async function startSeller(listenPort = port) {
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
  const chosen = await listenOnFreePort(server, listenPort);
  const url = `http://127.0.0.1:${chosen}/v1/snapshot`;
  if (listenPort !== 0 && chosen !== listenPort) {
    const busy = await isNgtSeller(listenPort);
    console.log(
      `[seller] Port ${listenPort} is already in use${busy ? " by another NGT seller, which is still running" : ""}. Using ${chosen} instead.`,
    );
  }
  console.log(`[seller] ${live ? "LIVE on Base" : "SIMULATED (no on-chain settlement)"}: ${url}  price ${price} NGT -> ${payTo}`);
  if (listenPort !== 0 && chosen !== listenPort) {
    console.log(`[seller] To pay this seller with the AgentKit agent: npm run agent -- ${url}`);
  }
  return { server, url };
}

function listenOnce(server, p) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve(server.address().port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(p, "127.0.0.1");
  });
}

async function listenOnFreePort(server, preferred) {
  const last = preferred === 0 ? 0 : Math.min(preferred + MAX_PORT_TRIES, 65535);
  for (let p = preferred; ; p++) {
    try {
      return await listenOnce(server, p);
    } catch (err) {
      if (err.code !== "EADDRINUSE" || p >= last) {
        if (err.code === "EADDRINUSE") {
          err.message = `Ports ${preferred}-${last} are all in use. Set PORT to a free port and try again.`;
        }
        throw err;
      }
    }
  }
}

/** True if whatever holds the port answers like an NGT seller (HTTP 402 on /v1/snapshot). */
async function isNgtSeller(p) {
  try {
    const res = await fetch(`http://127.0.0.1:${p}/v1/snapshot`, { signal: AbortSignal.timeout(2000) });
    return res.status === 402;
  } catch {
    return false;
  }
}

if (process.argv[1]?.endsWith("seller.mjs")) {
  await startSeller();
}
