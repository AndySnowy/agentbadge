# AgentBadge — Local E2E Test (anvil, chain 97) — 2026-11-19 ~22:40 WIB

Testnet deploy is BLOCKED on faucet funds (see FAUCET-BLOCKER.md). As a
substitute, the exact `DeployTestnet.s.sol` script was broadcast against a
local anvil node running chain ID 97. All code paths exercised are identical
to the real testnet deploy (same script, same constructor args, same seeding).

## How to reproduce
```
~/.foundry/bin/anvil --port 8545 --chain-id 97 &
cd ~/workspace/agent-id-hackathon/contract
~/.foundry/bin/forge script script/DeployTestnet.s.sol --rpc-url http://127.0.0.1:8545 \
  --broadcast --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
Notes:
- `forge script` does NOT read a `PRIVATE_KEY` env var — pass `--private-key`
  explicitly (first two broadcast attempts silently saved txs with no hashes
  because of this; receipts list was empty).
- The anvil account-0 key ends `...bf4f2ff80` (NOT `...bf4f3ff80`).

## Deployed (anvil)
- Mock Agent ID: 0x5FbDB2315678afecb367f032d93F642f64180aa3
- AgentBadge: 0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82
- Owner/deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (seeded with mock
  Agent ID + 10 of 12 mock collections)
- Broadcast receipt: contract/broadcast/DeployTestnet.s.sol/97/run-latest.json
  ("ONCHAIN EXECUTION COMPLETE & SUCCESSFUL")

## Results — ALL PASS
- collectionCount(deployer) = 10
- isEligible(deployer, 1..5) = true for all 5 badge types
- mint(1..5) all succeeded, status 1: token IDs 1000001, 2000001, 3000001,
  4000001, 5000001; Transfer + BadgeMinted events emitted
- balanceOf(deployer) = 5; totalMinted() = 5; ownerOf(5000001) = deployer
- Duplicate mint(1) reverts with custom error AlreadyMinted (0xddefae28)
- transferFrom reverts with custom error Soulbound (0xa4420a95)
- tokenURI(5000001) decodes: valid base64 JSON
  - name: "AgentBadge #5000001 — Collector III"
  - description: "Holds NFTs from at least 10 curated Agent ID collections.
    Soulbound achievement badge - no financial value."
  - attributes: Badge=Collector III, Type=5
  - image: base64 SVG (706 bytes), valid `<svg>`, contains "Collector III"

## Verdict
Contract + deploy script + seeding are proven end-to-end on a chain-97 node.
The only remaining step for the real BSC Testnet deploy is faucet funding of
the throwaway deployer (see FAUCET-BLOCKER.md). No code changes needed.
