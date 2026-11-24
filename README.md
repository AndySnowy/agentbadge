# AgentBadge

Soulbound achievement badges for Agent ID holders on BNB Chain.

AgentBadge is a single smart contract plus a static website. It mints
non-transferable (soulbound) ERC-721 badges that prove verifiable on-chain
achievements of an Agent ID holder. Every badge is bound to a Binance Agent ID
(a non-transferable `.ai` on-chain name) — without an Agent ID there is no
product.

Submitted to the **Binance Agent ID Hackathon** (November–December 2026).

## Live on BNB Chain mainnet

- **Contract:** [`0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89`](https://bscscan.com/address/0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89)
- **Website:** https://andysnowy.github.io/agentbadge/
- **Verification:** [Sourcify](https://sourcify.dev/server/v2/contract/56/0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89)
  exact match (creation + runtime); verified on BscScan
- **Deploy tx:** [`0x57c75263…9aa06`](https://bscscan.com/tx/0x57c75263bd13cebe1abf99439ab4ec84f57e7d4380eea05d4297200a5809aa06)
  (block 135403334, 2026-11-24)

> **Badges have no financial value.** They cannot be transferred, sold, or
> traded. They promise no returns, rewards, or airdrops. They are collectible
> proof of on-chain activity — reputation, not an asset.

## The five badges

| # | Badge | Eligibility (checked on-chain) |
|---|---|---|
| 1 | Verified Agent | Holds an Agent ID |
| 2 | Early Agent | Holds an Agent ID, and fewer than 100 badges have been minted so far |
| 3 | Collector I | Holds an Agent ID + NFTs from ≥1 curated collection |
| 4 | Collector II | Holds an Agent ID + NFTs from ≥5 curated collections |
| 5 | Collector III | Holds an Agent ID + NFTs from ≥10 curated collections |

One badge per wallet per type. Minting is free except gas (~$0.005 at current
prices). Token metadata (JSON + SVG art) lives fully on-chain — no IPFS, no
server — so every badge survives any hosting failure.

## Curated collections

Collector badges count distinct collections from an owner-managed list of
Agent-ID-gated ERC-721 collections, verified on-chain (ERC-721 interface +
working `balanceOf`):

Ptah Relics, Agentic404 Mirror, GLOOP, AgentsEstates, Ripstack Origin,
UNSOLVABLE, Dreadnought, AgentEcho, PXIO Miners, Chip404, Boltbook PodMint,
Slimelings.

The full list with addresses is in `contract/script/DeployMainnet.s.sol`.
Removing a collection never revokes badges that were already minted.

## Owner permissions (disclosed)

The contract owner is the deployer wallet. The owner **can**:

- add/remove curated collections (emits events),
- update badge art (per-type SVG override; empty restores the built-in art),
- pause minting.

The owner **cannot**:

- mint badges to anyone (only eligible holders mint for themselves),
- burn or transfer any user's badge,
- change eligibility retroactively,
- withdraw funds — the contract never holds funds and rejects plain BNB
  transfers.

## Repository layout

```
contract/   Foundry project: AgentBadge.sol, tests, deploy scripts
frontend/   Static website (vanilla JS + ethers.js), hosted on GitHub Pages
```

## Build & test (contract)

```bash
cd contract
forge build
forge test                                   # unit tests (26 tests)
forge test --match-contract AgentBadgeForkTest --fork-url <BSC RPC>
                                             # fork tests vs mainnet state
```

## Deploy

1. **BSC Testnet** (free faucet BNB):
   `forge script script/DeployTestnet.s.sol --rpc-url bsc_testnet --broadcast`
   This deploys a mock Agent ID contract + 12 mock collections and seeds the
   deployer so all five badge types are mintable end to end.
2. **BSC mainnet** (only after explicit confirmation — budget 0.0004 BNB):
   `forge script script/DeployMainnet.s.sol --rpc-url bsc --broadcast`
3. **Verify** on Sourcify first (no API key needed), then BscScan:
   `forge verify-contract --verifier sourcify <address> src/AgentBadge.sol:AgentBadge`

## Frontend

Static files in `frontend/` — no build step. Open `index.html` via any static
server (or GitHub Pages). The site connects through the injected wallet
provider only (`window.ethereum`); there is no QR login, no pairing code, and
no session storage. See `frontend/README-DEPLOY.md` for publishing steps.

## Security notes

- No user funds are ever held or moved by the contract. No approvals are
  requested. Each mint is a separate transaction the user sees and confirms
  themselves.
- `collectionCount` uses try/catch around every external `balanceOf` call, so
  a broken or malicious collection contract can never brick minting.
- The contract is unaudited. It is small (~400 lines), has no oracle, no
  upgrade path, and no fund custody by design.
