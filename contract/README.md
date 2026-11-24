# AgentBadge — Contract

Foundry project for the AgentBadge soulbound badge contract (ERC-721, BSC
mainnet). The contract gates all five badge types on holding a Binance Agent
ID and, for Collector badges, on holding NFTs from curated Agent-ID-gated
collections.

## Live deployment

- **Network:** BNB Smart Chain (chain 56)
- **Contract:** `0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89`
- **Deploy tx:** `0x57c75263bd13cebe1abf99439ab4ec84f57e7d4380eea05d4297200a5809aa06`
  (block 135403334, 2026-11-24)
- **Verification:** [Sourcify](https://sourcify.dev/server/v2/contract/56/0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89)
  exact match (creation + runtime); [BscScan](https://bscscan.com/address/0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89)
- **Owner:** `0xEc8E446852AEf6e62E6a18390C57D668B9342Be2`

The contract was deployed through the canonical CREATE2 deterministic
deployment proxy (`0x4e59b44847b379578588920cA78FbF26c0B4956C`) with salt
`keccak256("AgentBadge")`, because the deployer wallet (a Binance Agentic
Wallet) cannot send a contract-creation transaction directly. The constructor
therefore takes the owner as an explicit first parameter — otherwise the
factory would own the contract.

## Layout

| Path | What it is |
| --- | --- |
| `src/AgentBadge.sol` | The badge contract (~400 lines) |
| `src/mocks/Mocks.sol` | Mock ERC-721s for unit tests |
| `test/AgentBadge.t.sol` | Unit tests (27) |
| `test/AgentBadgeFork.t.sol` | Fork tests vs BSC mainnet state (5) |
| `test/AgentBadgeFactoryDeploy.t.sol` | Fork test of the factory deploy path (1) |
| `script/DeployMainnet.s.sol` | Mainnet deploy script (reference; the live deploy went through the CREATE2 factory) |
| `script/DeployTestnet.s.sol` | Testnet deploy script (mock Agent ID + collections) |

## Build & test

Requires [Foundry](https://book.getfoundry.sh/getting-started/installation).

```bash
forge install foundry-rs/forge-std openzeppelin/openzeppelin-contracts
forge build
forge test                                    # unit tests
forge test --match-contract AgentBadgeForkTest --fork-url https://bsc-dataseed1.binance.org
                                              # fork tests vs mainnet state
forge test --match-contract AgentBadgeFactoryDeployTest --fork-url https://bsc-dataseed1.binance.org
                                              # factory deploy path
```

All 33 tests pass (27 unit + 5 fork + 1 factory deploy).

## Deploy (reference)

Mainnet deploy via the CREATE2 factory (the path used for the live contract):

```bash
# 1. Build and take the creation code + ABI-encoded constructor args
#    (owner, Agent ID contract, 12 curated collections).
# 2. salt = keccak256("AgentBadge")
# 3. Send a transaction to the factory 0x4e59b44847b379578588920cA78FbF26c0B4956C
#    with raw calldata: salt (32 bytes) ++ creation code.
#    The factory returns the deployed address (20 raw bytes).
# The deployed address is deterministic:
#   keccak256(0xff ++ factory ++ salt ++ keccak256(initCode))[12:]
```

`script/DeployMainnet.s.sol` is the equivalent plain deployment (for a wallet
that can send a creation transaction):

```bash
forge script script/DeployMainnet.s.sol --rpc-url bsc --broadcast
```

## Security notes

- No user funds are ever held or moved by the contract. No approvals are
  requested. Each mint is a separate transaction the user sees and confirms
  themselves.
- `collectionCount` uses try/catch around every external `balanceOf` call, so
  a broken or malicious collection contract can never brick minting.
- The contract is unaudited. It is small (~400 lines), has no oracle, no
  upgrade path, and no fund custody by design.
