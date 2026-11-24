// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AgentBadge} from "../src/AgentBadge.sol";

/// @notice Fork tests against BSC mainnet state.
/// Run with: forge test --match-contract AgentBadgeForkTest --fork-url <BSC RPC>
/// These tests pin the real Agent ID contract + the 12 real curated
/// collections, and prank the real user wallet (kenangan1.ai).
contract AgentBadgeForkTest is Test {
    address constant AGENT_ID = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;
    address constant USER_WALLET = 0xEc8E446852AEf6e62E6a18390C57D668B9342Be2;

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

    AgentBadge public badge;

    function setUp() public {
        address[12] memory cols = _collections();
        address[] memory initial = new address[](12);
        for (uint256 i = 0; i < 12; i++) initial[i] = cols[i];
        badge = new AgentBadge(address(this), AGENT_ID, initial);
    }

    function testForkUserWalletCollectionCount() public view {
        // Verified by direct eth_call 2026-11-19: wallet holds NFTs in 10 of
        // the 12 collections (0 in Chip404 and Boltbook PodMint).
        assertEq(badge.collectionCount(USER_WALLET), 10);
    }

    function testForkUserWalletEligibleForAllBadges() public view {
        for (uint8 t = 1; t <= 5; t++) {
            assertTrue(badge.isEligible(USER_WALLET, t));
        }
    }

    function testForkUserWalletMintsAllFive() public {
        vm.startPrank(USER_WALLET);
        for (uint8 t = 1; t <= 5; t++) badge.mint(t);
        vm.stopPrank();
        assertEq(badge.balanceOf(USER_WALLET), 5);
        assertEq(badge.totalMinted(), 5);
        assertEq(badge.ownerOf(1_000_001), USER_WALLET);
        assertEq(badge.ownerOf(2_000_001), USER_WALLET);
        assertEq(badge.ownerOf(3_000_001), USER_WALLET);
        assertEq(badge.ownerOf(4_000_001), USER_WALLET);
        assertEq(badge.ownerOf(5_000_001), USER_WALLET);
    }

    function testForkNonHolderCannotMint() public {
        address stranger = address(0xDEAD);
        assertFalse(badge.isEligible(stranger, 1));
        vm.prank(stranger);
        vm.expectRevert(AgentBadge.NotAgentIdHolder.selector);
        badge.mint(1);
    }

    function testForkTokenURIDecodes() public {
        vm.prank(USER_WALLET);
        badge.mint(1);
        string memory uri = badge.tokenURI(1_000_001);
        assertTrue(bytes(uri).length > 100);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
    }

    function _startsWith(string memory s, string memory prefix) internal pure returns (bool) {
        bytes memory a = bytes(s);
        bytes memory b = bytes(prefix);
        if (a.length < b.length) return false;
        for (uint256 i = 0; i < b.length; i++) {
            if (a[i] != b[i]) return false;
        }
        return true;
    }
}
