// Read one transaction from Base mainnet and print its status, who paid gas, and any token transfers.
// Usage: node verify-tx.mjs <tx hash>
import { createPublicClient, decodeEventLog, erc20Abi, formatEther, formatUnits, http } from "viem";
import { base } from "viem/chains";

const hash = process.argv[2];
if (!/^0x[0-9a-fA-F]{64}$/.test(hash ?? "")) {
  console.log("Usage: node verify-tx.mjs <tx hash>");
  process.exit(1);
}
const c = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org") });
const r = await c.getTransactionReceipt({ hash });
console.log(`status   ${r.status} (block ${r.blockNumber})`);
console.log(`sent by  ${r.from} (pays gas: ${formatEther(r.gasUsed * r.effectiveGasPrice)} ETH)`);
for (const l of r.logs) {
  try {
    const e = decodeEventLog({ abi: erc20Abi, data: l.data, topics: l.topics });
    if (e.eventName === "Transfer") console.log(`transfer ${formatUnits(e.args.value, 18)} NGT  ${e.args.from} -> ${e.args.to}`);
  } catch {}
}
