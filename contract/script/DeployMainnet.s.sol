// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AgentBadge} from "../src/AgentBadge.sol";

/// @notice Mainnet deploy: AgentBadge gated on the real SPACE ID Agent ID
/// contract + the 12 verified curated collections.
/// Usage (DO NOT RUN without the user's explicit confirmation):
///   forge script script/DeployMainnet.s.sol --rpc-url bsc --broadcast
/// The deployer key comes from $PRIVATE_KEY. In production the deploy goes
/// through `baw` (preview + execute) from the agentic wallet instead.
contract DeployMainnet is Script {
    address constant AGENT_ID = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;
    // Production deployer/owner: the Binance Agentic Wallet (kenangan1.ai).
    // The real deploy goes through `baw` + the CREATE2 factory, so the
    // owner must be passed explicitly (msg.sender at construction would
    // otherwise be the factory).
    address constant DEPLOYER = 0xEc8E446852AEf6e62E6a18390C57D668B9342Be2;

    function _collections() internal pure returns (address[12] memory) {
        return [
            0xe8C6b38b5E63377a96b268319B66638f772254bb, // Ptah Relics
            0xc6d38bc5D854fDA20bD4473e9f3D0486747C178C, // Agentic404 Mirror
            0x587C303982187Ec578dF309d27670327b13202F8, // GLOOP
            0x439643cfd023c247519518B7F73d06823E1F2fCe, // AgentsEstates
            0x72376F145c3e6af620b2aBEA259F9193460643Bd, // Ripstack Origin
            0x9e95Da84f1bcc8E5570DAAc99A37EB3f95270904, // UNSOLVABLE
            0x8D0619C59418Ed042e43838bb6e83038303d27f6, // Dreadnought
            0xff2DAc2389a6A9593209b6008d5ffA9E73AA19C2, // AgentEcho
            0x58e8f1b34B60687B36BCdc78e02a2fd443De71Ab, // PXIO Miners
            0xAB6b18C626daaDd1ff7Cc45F402141153a5a9759, // Chip404
            0x74164ED868bFaD68eAAffA36f828019456D520DA, // Boltbook PodMint
            0x3815A26a6981BAAd0b850f7522B7a8BDDdB6B70C // Slimelings
        ];
    }

    function run() external returns (AgentBadge badge) {
        address[12] memory cols = _collections();
        address[] memory initial = new address[](12);
        for (uint256 i = 0; i < 12; i++) initial[i] = cols[i];

        vm.startBroadcast();
        badge = new AgentBadge(DEPLOYER, AGENT_ID, initial);
        vm.stopBroadcast();

        console.log("AgentBadge deployed at:", address(badge));
        console.log("Owner:", badge.owner());
        console.log("Curated collections:", badge.curatedCollectionCount());
    }
}
