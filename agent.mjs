// A Coinbase AgentKit agent pays the seller with ngt_pay_and_fetch.
// The AgentKit wallet signs an EIP-3009 authorization; it never needs ETH.
import "./env.mjs";
import { AgentKit, ViemWalletProvider } from "@coinbase/agentkit";
import { ngtActionProvider } from "@ngtchain/agentkit";
import { createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// AgentKit 0.10.4 posts usage analytics and throws when the endpoint rejects it,
// which would crash the demo after it finished. Ignore only that error.
process.on("unhandledRejection", (err) => {
  if (String(err?.stack).includes("sendAnalyticsEvent")) return;
  throw err;
});

export async function runAgent(url) {
  const key = process.env.AGENT_PRIVATE_KEY || generatePrivateKey();
  const account = privateKeyToAccount(key);
  const walletProvider = new ViemWalletProvider(
    createWalletClient({ account, chain: base, transport: http(process.env.BASE_RPC_URL) }),
  );

  const agentkit = await AgentKit.from({
    walletProvider,
    actionProviders: [ngtActionProvider({ maxPrice: "0.01", sessionBudget: "0.05" })],
  });
  const pay = agentkit.getActions().find((a) => a.name.endsWith("ngt_pay_and_fetch"));

  console.log(`[agent]  AgentKit wallet ${account.address}`);
  console.log(`[agent]  actions: ${agentkit.getActions().map((a) => a.name).join(", ")}`);
  console.log(`[agent]  calling ${url} (cap 0.01 NGT, session budget 0.05 NGT)`);

  const result = await pay.invoke({ url });
  if (result.startsWith("Error")) {
    console.log(`[agent]  ${result}`);
    return result;
  }
  const { data, payment, budgetLeft } = JSON.parse(result);
  if (payment.transaction && payment.transaction.startsWith("0x")) {
    console.log(`[agent]  paid ${payment.amount} NGT to ${payment.payTo}`);
    console.log(`[agent]  Base tx: https://basescan.org/tx/${payment.transaction}`);
  } else {
    console.log(`[agent]  signed a ${payment.amount} NGT authorization to ${payment.payTo}`);
    console.log("[agent]  settlement was SIMULATED: no NGT moved, no transaction on Base");
  }
  console.log(`[agent]  data: ${JSON.stringify(data)}`);
  console.log(`[agent]  budget left: ${budgetLeft}`);
  return result;
}

if (process.argv[1]?.endsWith("agent.mjs")) {
  await runAgent(process.argv[2] || `http://127.0.0.1:${process.env.PORT || 4021}/v1/snapshot`);
}
