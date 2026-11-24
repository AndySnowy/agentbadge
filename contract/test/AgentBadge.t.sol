// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AgentBadge} from "../src/AgentBadge.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MockERC721, RevertingCollection} from "../src/mocks/Mocks.sol";

contract AgentBadgeTest is Test {
    AgentBadge public badge;
    MockERC721 public agentId;
    MockERC721[] public collections;
    RevertingCollection public broken;

    address public owner = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    uint8 constant V = 1;
    uint8 constant E = 2;
    uint8 constant C1 = 3;
    uint8 constant C2 = 4;
    uint8 constant C3 = 5;

    function setUp() public {
        agentId = new MockERC721("SPACE ID Agent ID", "AI");
        address[] memory initial = new address[](12);
        for (uint256 i = 0; i < 12; i++) {
            MockERC721 c = new MockERC721(string.concat("Collection ", vm.toString(i)), "C");
            collections.push(c);
            initial[i] = address(c);
        }
        badge = new AgentBadge(address(this), address(agentId), initial);
        broken = new RevertingCollection();

        // alice: Agent ID holder with NFTs in 5 collections
        agentId.mint(alice);
        for (uint256 i = 0; i < 5; i++) collections[i].mint(alice);
        // bob: Agent ID holder with NFTs in 10 collections
        agentId.mint(bob);
        for (uint256 i = 0; i < 10; i++) collections[i].mint(bob);
    }

    // ------------------------------------------------------------------
    // Minting — happy paths
    // ------------------------------------------------------------------

    function testMintVerifiedAgent() public {
        vm.prank(alice);
        badge.mint(V);
        assertEq(badge.balanceOf(alice), 1);
        assertEq(badge.ownerOf(1_000_001), alice);
        assertTrue(badge.hasBadge(alice, V));
        assertEq(badge.totalMinted(), 1);
        assertEq(badge.badgeCount(V), 1);
        assertEq(badge.badgeTypeOf(1_000_001), V);
    }

    function testMintEarlyAgent() public {
        vm.prank(alice);
        badge.mint(E);
        assertEq(badge.ownerOf(2_000_001), alice);
    }

    function testMintCollectorTiers() public {
        // alice holds 5 collections: I + II eligible, III not
        assertTrue(badge.isEligible(alice, C1));
        assertTrue(badge.isEligible(alice, C2));
        assertFalse(badge.isEligible(alice, C3));
        vm.prank(alice);
        badge.mint(C1);
        vm.prank(alice);
        badge.mint(C2);
        assertEq(badge.ownerOf(3_000_001), alice);
        assertEq(badge.ownerOf(4_000_001), alice);

        // bob holds 10 collections: all tiers eligible
        assertTrue(badge.isEligible(bob, C3));
        vm.prank(bob);
        badge.mint(C3);
        assertEq(badge.ownerOf(5_000_001), bob);
    }

    function testCollectionCount() public view {
        assertEq(badge.collectionCount(alice), 5);
        assertEq(badge.collectionCount(bob), 10);
        assertEq(badge.collectionCount(address(0xDEAD)), 0);
    }

    function testTokenIdSerials() public {
        vm.prank(alice);
        badge.mint(V);
        vm.prank(bob);
        badge.mint(V);
        assertEq(badge.ownerOf(1_000_001), alice);
        assertEq(badge.ownerOf(1_000_002), bob);
    }

    // ------------------------------------------------------------------
    // Minting — reverts
    // ------------------------------------------------------------------

    function testMintRevertsWithoutAgentId() public {
        address stranger = address(0x5A7);
        vm.prank(stranger);
        vm.expectRevert(AgentBadge.NotAgentIdHolder.selector);
        badge.mint(V);
    }

    function testMintRevertsWhenAlreadyMinted() public {
        vm.prank(alice);
        badge.mint(V);
        vm.prank(alice);
        vm.expectRevert(AgentBadge.AlreadyMinted.selector);
        badge.mint(V);
    }

    function testMintRevertsInvalidBadgeType() public {
        vm.prank(alice);
        vm.expectRevert(AgentBadge.InvalidBadgeType.selector);
        badge.mint(0);
        vm.prank(alice);
        vm.expectRevert(AgentBadge.InvalidBadgeType.selector);
        badge.mint(6);
    }

    function testMintRevertsWhenNotEligible() public {
        // alice holds only 5 collections: Collector III not eligible
        vm.prank(alice);
        vm.expectRevert(AgentBadge.NotEligible.selector);
        badge.mint(C3);
    }

    function testEarlyAgentCap() public {
        // Mint exactly 100 badges across fresh Agent ID holders.
        for (uint256 i = 0; i < 100; i++) {
            address holder = address(uint160(0x1000 + i));
            agentId.mint(holder);
            vm.prank(holder);
            badge.mint(V);
        }
        assertEq(badge.totalMinted(), 100);
        // 101st holder can no longer claim Early Agent…
        assertFalse(badge.isEligible(alice, E));
        vm.prank(alice);
        vm.expectRevert(AgentBadge.NotEligible.selector);
        badge.mint(E);
        // …but Verified Agent is still open.
        assertTrue(badge.isEligible(alice, V));
    }

    function testMintRevertsWhenPaused() public {
        badge.setPaused(true);
        vm.prank(alice);
        vm.expectRevert();
        badge.mint(V);
        badge.setPaused(false);
        vm.prank(alice);
        badge.mint(V);
        assertEq(badge.balanceOf(alice), 1);
    }

    // ------------------------------------------------------------------
    // Soulbound
    // ------------------------------------------------------------------

    function testTransferReverts() public {
        vm.prank(alice);
        badge.mint(V);
        vm.prank(alice);
        vm.expectRevert(AgentBadge.Soulbound.selector);
        badge.transferFrom(alice, bob, 1_000_001);
        vm.prank(alice);
        vm.expectRevert(AgentBadge.Soulbound.selector);
        badge.safeTransferFrom(alice, bob, 1_000_001);
    }

    function testApproveReverts() public {
        vm.prank(alice);
        badge.mint(V);
        vm.prank(alice);
        vm.expectRevert(AgentBadge.Soulbound.selector);
        badge.approve(bob, 1_000_001);
        vm.prank(alice);
        vm.expectRevert(AgentBadge.Soulbound.selector);
        badge.setApprovalForAll(bob, true);
    }

    function testBurnByOwnerWorksButNoRemint() public {
        vm.prank(alice);
        badge.mint(V);
        vm.prank(alice);
        badge.burn(1_000_001);
        assertEq(badge.balanceOf(alice), 0);
        // Burned badge cannot be re-minted (one per address per type, ever).
        assertTrue(badge.hasBadge(alice, V));
        vm.prank(alice);
        vm.expectRevert(AgentBadge.AlreadyMinted.selector);
        badge.mint(V);
        // totalMinted is monotonic — burning does not reopen Early Agent slots.
        assertEq(badge.totalMinted(), 1);
    }

    function testBurnByNonOwnerReverts() public {
        vm.prank(alice);
        badge.mint(V);
        vm.prank(bob);
        vm.expectRevert(AgentBadge.Soulbound.selector);
        badge.burn(1_000_001);
    }

    // ------------------------------------------------------------------
    // Owner administration
    // ------------------------------------------------------------------

    function testAddRemoveCollection() public {
        MockERC721 extra = new MockERC721("Extra", "X");
        badge.addCollection(address(extra));
        assertTrue(badge.isCuratedCollection(address(extra)));
        assertEq(badge.curatedCollectionCount(), 13);

        badge.removeCollection(address(extra));
        assertFalse(badge.isCuratedCollection(address(extra)));
        assertEq(badge.curatedCollectionCount(), 12);
    }

    function testAddCollectionReverts() public {
        vm.expectRevert(AgentBadge.ZeroAddress.selector);
        badge.addCollection(address(0));
        vm.expectRevert(AgentBadge.AlreadyCurated.selector);
        badge.addCollection(address(collections[0]));
    }

    function testRemoveCollectionRevertsWhenNotCurated() public {
        vm.expectRevert(AgentBadge.NotCurated.selector);
        badge.removeCollection(address(0x1234));
    }

    function testOnlyOwnerCanAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        badge.addCollection(address(0x1234));
        vm.prank(alice);
        vm.expectRevert();
        badge.setPaused(true);
        vm.prank(alice);
        vm.expectRevert();
        badge.setArtOverride(V, "<svg/>");
    }

    function testRemovalDoesNotRevokeBadges() public {
        vm.prank(alice);
        badge.mint(C2); // alice holds 5 collections
        // Remove all 5 of alice's collections — her badge stays.
        for (uint256 i = 0; i < 5; i++) badge.removeCollection(address(collections[i]));
        assertEq(badge.balanceOf(alice), 1);
        assertEq(badge.ownerOf(4_000_001), alice);
        assertEq(badge.collectionCount(alice), 0);
    }

    function testBrokenCollectionCountsAsZero() public {
        badge.addCollection(address(broken));
        // collectionCount must not revert and must ignore the broken one.
        assertEq(badge.collectionCount(alice), 5);
        vm.prank(alice);
        badge.mint(C2); // still works with a broken collection in the list
    }

    function testArtOverride() public {
        vm.prank(alice);
        badge.mint(V);
        string memory before = badge.tokenURI(1_000_001);
        badge.setArtOverride(V, "<svg>custom</svg>");
        string memory after_ = badge.tokenURI(1_000_001);
        assertTrue(bytes(before).length != bytes(after_).length);
        // Empty string restores built-in art.
        badge.setArtOverride(V, "");
        assertEq(badge.tokenURI(1_000_001), before);
    }

    function testConstructorRevertsZeroAgentId() public {
        vm.expectRevert(AgentBadge.ZeroAddress.selector);
        new AgentBadge(address(this), address(0), new address[](0));
    }

    function testConstructorRevertsZeroOwner() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableInvalidOwner.selector, address(0)
            )
        );
        new AgentBadge(address(0), address(agentId), new address[](0));
    }

    function testReceiveReverts() public {
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(badge).call{value: 0.001 ether}("");
        assertFalse(ok);
        assertEq(address(badge).balance, 0);
    }

    // ------------------------------------------------------------------
    // Metadata
    // ------------------------------------------------------------------

    function testTokenURIFormat() public {
        vm.prank(alice);
        badge.mint(V);
        string memory uri = badge.tokenURI(1_000_001);
        // Must be a base64 data URI.
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
        // Decoding is verified off-chain; here we check the badge type and
        // that each type produces distinct metadata.
        vm.prank(alice);
        badge.mint(E);
        assertTrue(
            keccak256(bytes(badge.tokenURI(2_000_001))) != keccak256(bytes(uri))
        );
    }

    function testTokenURIRevertsForNonexistent() public {
        vm.expectRevert();
        badge.tokenURI(1_000_001);
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
