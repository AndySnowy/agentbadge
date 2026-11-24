# AgentBadge — Mainnet Deploy Record

- **Deployed:** Tue 2026-11-24 ~12:01 WIB (block 135403334)
- **Contract:** `0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89`
- **Tx:** `0x57c75263bd13cebe1abf99439ab4ec84f57e7d4380eea05d4297200a5809aa06`
- **Deploy path:** CREATE2 deterministic deployment proxy
  `0x4e59b44847b379578588920cA78FbF26c0B4956C` (baw `contract-call` cannot
  send a contract-creation tx — `to` is required — so the deploy went
  through the factory with raw calldata: salt ++ init code).
- **Salt:** keccak256("AgentBadge") =
  `0xb3a18573b682fb69f8bd26d2f66e8fb24c9064e861e99497e7c97fbfb93c1932`
- **Gas used:** 3,366,625 @ 0.074083334 gwei = **0.0002494108 BNB**
  (approved budget 0.0004 BNB)
- **Owner:** `0xEc8E446852AEf6e62E6a18390C57D668B9342Be2` (agentic wallet)
- **Agent ID:** `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`
- **Curated collections:** 12 (verified on-chain)
- **Tests at deploy:** 33/33 pass (27 unit + 5 fork + 1 factory-deploy fork test)
- **Constructor change for factory deploy:** `Ownable(msg.sender)` →
  `Ownable(owner_)` with an explicit `owner_` constructor param (the
  factory would otherwise own the contract). OpenZeppelin Ownable already
  rejects a zero owner, so no extra check was added.

## Verification status
- Sourcify: **DONE — exact_match** (creation + runtime), verified
  2026-11-24T05:02:27Z. https://sourcify.dev/server/v2/contract/56/0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89
- BscScan: pending — needs the user's BscScan API key
- Frontend config: DONE — `docs/config.js` points at mainnet contract
- GitHub repo + Pages: pending — user is AndySnowy on GitHub
