// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AgentBadge} from "../src/AgentBadge.sol";
import {MockERC721} from "../src/mocks/Mocks.sol";

/// @notice Testnet deploy: deploys a mock Agent ID contract + 12 mock
/// collections, mints a mock Agent ID and mock collection NFTs to the
/// deployer (so all 5 badge types are mintable end-to-end), then deploys
/// AgentBadge pointing at the mocks.
/// Usage:
///   forge script script/DeployTestnet.s.sol --rpc-url bsc_testnet --broadcast
/// The deployer key comes from $PRIVATE_KEY (a throwaway testnet key funded
/// from the public BSC testnet faucet — never a real key).
contract DeployTestnet is Script {
    function run()
        external
        returns (AgentBadge badge, MockERC721 agentId, MockERC721[] memory mocks)
    {
        vm.startBroadcast();
        agentId = new MockERC721("Mock Agent ID", "AI");
        mocks = new MockERC721[](12);
        address[] memory initial = new address[](12);
        for (uint256 i = 0; i < 12; i++) {
            mocks[i] = new MockERC721(string.concat("Mock Collection ", vm.toString(i)), "MOCK");
            initial[i] = address(mocks[i]);
        }
        badge = new AgentBadge(msg.sender, address(agentId), initial);

        // Seed the deployer: mock Agent ID + 1 NFT in 10 of 12 collections
        // (mirrors the real wallet's mainnet holdings: 10/12).
        address deployer = msg.sender;
        agentId.mint(deployer);
        for (uint256 i = 0; i < 10; i++) mocks[i].mint(deployer);
        vm.stopBroadcast();

        console.log("Mock Agent ID:", address(agentId));
        console.log("AgentBadge:", address(badge));
        console.log("Owner:", badge.owner());
        for (uint256 i = 0; i < 12; i++) {
            console.log("Mock collection", i, address(mocks[i]));
        }
    }
}
