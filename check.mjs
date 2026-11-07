// Read-only preflight for a live run: is the agent funded with NGT, and can the facilitator pay gas?
import "./env.mjs";
import { createPublicClient, erc20Abi, formatEther, formatUnits, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const NGT = "0xc97b05F2F68D5CED7aB65F83ab5f4f7A64d9CC44";
const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org") });
const price = parseUnits(process.env.PRICE_NGT || "0.001", 18);
let ok = true;

function need(name) {
  if (!process.env[name]) {
    console.log(`MISSING  ${name} is not set (see .env.example)`);
    ok = false;
  }
  return process.env[name];
}

const agentKey = need("AGENT_PRIVATE_KEY");
const facilitatorKey = need("FACILITATOR_KEY");
const payTo = need("SELLER_PAY_TO");

if (agentKey) {
  const agent = privateKeyToAccount(agentKey).address;
  const bal = await client.readContract({ address: NGT, abi: erc20Abi, functionName: "balanceOf", args: [agent] });
  const enough = bal >= price;
  ok &&= enough;
  console.log(`${enough ? "OK      " : "LOW     "} agent ${agent} holds ${formatUnits(bal, 18)} NGT (needs ${formatUnits(price, 18)})`);
}
if (facilitatorKey) {
  const fac = privateKeyToAccount(facilitatorKey).address;
  const eth = await client.getBalance({ address: fac });
  const enough = eth > 0n;
  ok &&= enough;
  console.log(`${enough ? "OK      " : "LOW     "} facilitator ${fac} holds ${formatEther(eth)} ETH for gas`);
}
if (payTo) console.log(`INFO     NGT will be paid to ${payTo}`);

console.log(ok ? "\nReady for a live run: npm run demo" : "\nNot ready. Fix the lines above, then run this again.");
process.exitCode = ok ? 0 : 1;
