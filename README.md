# NGT × Coinbase AgentKit demo

A [Coinbase AgentKit](https://github.com/coinbase/agentkit) agent pays an API per call on Base using x402, with [`@ngtchain/agentkit`](https://www.npmjs.com/package/@ngtchain/agentkit).

- The **seller** puts an x402 paywall on one endpoint with [`@ngtchain/paywall`](https://www.npmjs.com/package/@ngtchain/paywall).
- The **agent** is an AgentKit wallet with one extra action, `ngt_pay_and_fetch`. It signs an EIP-3009 `TransferWithAuthorization`. It needs NGT but **no ETH**: the seller settles on Base and pays the gas.
- The agent can't overspend: every call has a price cap (0.01 NGT) and the session has a budget (0.05 NGT).

```
agent ── GET /v1/snapshot ──────────────▶ seller
agent ◀── 402 Payment Required (x402) ── seller
agent ── signed EIP-3009 authorization ─▶ seller ── settles on Base, pays gas
agent ◀── 200 + data + tx hash ───────── seller
```

## Run it (simulated, no wallet needed)

```bash
npm install
npm run demo
```

With no keys set, the seller checks the signature for real but **simulates settlement**: no NGT moves and nothing is sent to Base. The output says so on every line where it matters.

## Run it live on Base

1. `cp .env.example .env` and fill in:
   - `AGENT_PRIVATE_KEY`: a fresh wallet holding a little NGT (at least the price, 0.001 NGT by default). No ETH needed.
   - `SELLER_PAY_TO`: the wallet that receives the NGT.
   - `FACILITATOR_KEY`: a wallet with a little Base ETH. It submits the settlement and pays the gas.
2. `npm run check` reads balances on Base and tells you if anything is missing.
3. `npm run demo` makes one real payment and prints the Basescan link.
4. `node verify-tx.mjs <tx hash>` reads the transaction straight from Base: status, who paid gas, and the NGT transfer.

A real run settled 0.001 NGT on Base mainnet in [`0x4a578b05…d72a`](https://basescan.org/tx/0x4a578b050467b918d3400c231551cf9e5988fd001d763e1c1edb38710022d72a); the seller paid the gas.

Or run the two sides separately: `npm run seller` in one terminal, `npm run agent` in another. The seller prefers port 4021 (or `PORT`). If that port is taken, for example by a seller that is already running, it uses the next free port and prints the `npm run agent -- <url>` command to use instead.

## Files

| File | |
|---|---|
| `seller.mjs` | x402 paywall in front of `/v1/snapshot` |
| `agent.mjs` | AgentKit `ViemWalletProvider` + `ngtActionProvider`, calls `ngt_pay_and_fetch` |
| `demo.mjs` | starts the seller, runs the agent once, stops |
| `check.mjs` | read-only balance check before a live run |
| `verify-tx.mjs` | read-only check of a transaction on Base |

Keys stay in `.env`, which is git-ignored.
