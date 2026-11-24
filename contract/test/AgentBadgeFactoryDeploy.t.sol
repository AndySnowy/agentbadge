// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AgentBadge} from "../src/AgentBadge.sol";

/// @notice Fork test for the production deploy path: the Binance Agentic
/// Wallet cannot send a contract-creation transaction (baw contract-call
/// requires a `to` address), so AgentBadge is deployed through the
/// canonical CREATE2 deterministic deployment proxy. This test proves the
/// factory deploy lands at the precomputed address with the right owner,
/// collections, and a working mint for the real wallet.
contract AgentBadgeFactoryDeployTest is Test {
    address constant FACTORY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    address constant AGENT_ID = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;
    address constant OWNER = 0xEc8E446852AEf6e62E6a18390C57D668B9342Be2;
    bytes32 constant SALT = 0xb3a18573b682fb69f8bd26d2f66e8fb24c9064e861e99497e7c97fbfb93c1932;
    address constant EXPECTED = 0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89;

    function testFactoryDeploy() public {
        bytes memory init = vm.getCode("src/AgentBadge.sol:AgentBadge");
        address[] memory initial = new address[](12);
        initial[0] = 0xe8C6b38b5E63377a96b268319B66638f772254bb; // Ptah Relics
        initial[1] = 0xc6d38bc5D854fDA20bD4473e9f3D0486747C178C; // Agentic404 Mirror
        initial[2] = 0x587C303982187Ec578dF309d27670327b13202F8; // GLOOP
        initial[3] = 0x439643cfd023c247519518B7F73d06823E1F2fCe; // AgentsEstates
        initial[4] = 0x72376F145c3e6af620b2aBEA259F9193460643Bd; // Ripstack Origin
        initial[5] = 0x9e95Da84f1bcc8E5570DAAc99A37EB3f95270904; // UNSOLVABLE
        initial[6] = 0x8D0619C59418Ed042e43838bb6e83038303d27f6; // Dreadnought
        initial[7] = 0xff2DAc2389a6A9593209b6008d5ffA9E73AA19C2; // AgentEcho
        initial[8] = 0x58e8f1b34B60687B36BCdc78e02a2fd443De71Ab; // PXIO Miners
        initial[9] = 0xAB6b18C626daaDd1ff7Cc45F402141153a5a9759; // Chip404
        initial[10] = 0x74164ED868bFaD68eAAffA36f828019456D520DA; // Boltbook PodMint
        initial[11] = 0x3815A26a6981BAAd0b850f7522B7a8BDDdB6B70C; // Slimelings

        bytes memory creation =
            abi.encodePacked(init, abi.encode(OWNER, AGENT_ID, initial));

        // The Arachnid proxy takes RAW calldata: salt (32 bytes) ++ init
        // code. It has no `deploy(bytes32,bytes)` function — an ABI-encoded
        // call reverts. It returns the deployed address (32 bytes).
        bytes memory proxyCalldata = abi.encodePacked(SALT, creation);
        (bool ok, bytes memory ret) = FACTORY.call(proxyCalldata);
        assertTrue(ok, "factory deploy failed");
        // The proxy returns the raw 20-byte address, not a 32-byte
        // ABI-encoded word, so abi.decode would revert.
        address deployed = address(bytes20(ret));
        assertEq(deployed, EXPECTED, "CREATE2 address mismatch");

        AgentBadge b = AgentBadge(payable(deployed));
        assertEq(b.owner(), OWNER, "owner mismatch");
        assertEq(b.curatedCollectionCount(), 12, "collection count mismatch");
        assertEq(b.agentId(), AGENT_ID, "agentId mismatch");

        // The real wallet can mint badge 1 (Verified Agent) on the fork.
        vm.prank(OWNER);
        b.mint(1);
        assertEq(b.balanceOf(OWNER), 1, "mint failed");
    }
}
