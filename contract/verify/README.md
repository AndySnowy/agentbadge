# BscScan verification — AgentBadge

Contract: `0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89` (BSC mainnet)

The contract is already verified on Sourcify (exact match, creation +
runtime). These files are everything needed to verify it on BscScan too.

## Files

| File | What it is |
| --- | --- |
| `standard-json-input.json` | Standard JSON compiler input (15 sources), produced by `forge verify-contract --show-standard-json-input` |
| `flattened.sol` | Single-file flattened source (`forge flatten`), alternative to the JSON input |
| `constructor-args.txt` | ABI-encoded constructor args (owner, Agent ID contract, 12 curated collections) — paste without the `0x` prefix |

## Verify via the BscScan web form (no API key)

1. Open https://bscscan.com/verifyContract
2. Contract Address: `0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89`
3. Compiler Type: **Solidity (Standard-Json-Input)**
4. Compiler Version: **v0.8.24+commit.e11b9ed9**
5. Open Source License Type: **MIT License (MIT)**
6. Paste the full contents of `standard-json-input.json` into the
   Standard-Json-Input field.
7. Paste the contents of `constructor-args.txt` (without `0x`) into the
   Constructor Arguments field.
8. If asked: EVM Version **Cancun**, Optimization **Yes**, Runs **200**.
9. Submit. The settings are proven: the same input gives an exact match on
   Sourcify.

## Verify via Foundry (needs a BscScan/Etherscan API key)

```bash
export BSCSCAN_API_KEY=<your key>
forge verify-contract --verifier etherscan --rpc-url https://bsc-dataseed1.binance.org \
  --constructor-args $(cat contract/verify/constructor-args.txt) \
  0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89 src/AgentBadge.sol:AgentBadge
```
