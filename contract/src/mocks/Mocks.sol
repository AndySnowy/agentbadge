// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Minimal mintable ERC-721 used as a stand-in for the Agent ID
/// contract and curated collections in unit tests and on BSC Testnet.
contract MockERC721 is ERC721 {
    uint256 private _nextId = 1;

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _safeMint(to, tokenId);
    }

    function mintMany(address to, uint256 count) external {
        for (uint256 i = 0; i < count; i++) {
            _safeMint(to, _nextId++);
        }
    }
}

/// @notice A contract whose balanceOf always reverts — used to prove
/// AgentBadge.collectionCount treats broken collections as 0, not a brick.
contract RevertingCollection {
    function balanceOf(address /*owner*/) external pure returns (uint256) {
        revert("boom");
    }
}
