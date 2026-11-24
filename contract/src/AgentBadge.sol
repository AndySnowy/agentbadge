// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

interface IERC721Balance {
    function balanceOf(address owner) external view returns (uint256);
}

/// @title AgentBadge — soulbound achievement badges for Agent ID holders
/// @notice Every badge is bound to a Binance Agent ID (a non-transferable `.ai`
/// on-chain name). Badges are collectible proof of on-chain activity. They have
/// NO financial value, cannot be transferred or sold, and promise no returns,
/// rewards, or airdrops.
/// @dev Submitted to the Binance Agent ID Hackathon (Nov–Dec 2026).
///
/// OWNER PERMISSIONS (disclosed per hackathon rules):
/// - Owner CAN: add/remove curated collections, update badge art, pause minting.
/// - Owner CANNOT: mint badges to anyone (only eligible holders mint for
///   themselves), burn or transfer any user's badge, change eligibility
///   retroactively, or withdraw funds (this contract never holds funds —
///   minting is free except gas).
contract AgentBadge is ERC721, Ownable, Pausable {
    // ------------------------------------------------------------------------
    // Types & constants
    // ------------------------------------------------------------------------

    /// @notice Badge type ids. 1 = Verified Agent, 2 = Early Agent,
    /// 3 = Collector I, 4 = Collector II, 5 = Collector III.
    uint8 public constant VERIFIED_AGENT = 1;
    uint8 public constant EARLY_AGENT = 2;
    uint8 public constant COLLECTOR_I = 3;
    uint8 public constant COLLECTOR_II = 4;
    uint8 public constant COLLECTOR_III = 5;
    uint8 public constant NUM_BADGE_TYPES = 5;

    /// @notice Early Agent is limited to the first 100 badges ever minted.
    uint256 public constant EARLY_AGENT_CAP = 100;

    /// @notice Collector tiers: distinct curated collections held.
    uint256 public constant COLLECTOR_I_THRESHOLD = 1;
    uint256 public constant COLLECTOR_II_THRESHOLD = 5;
    uint256 public constant COLLECTOR_III_THRESHOLD = 10;

    /// @notice Token id = badgeType * 1_000_000 + per-type serial.
    uint256 public constant TOKEN_ID_STRIDE = 1_000_000;

    /// @notice The SPACE ID Agent ID contract (ERC-721, non-transferable).
    address public immutable agentId;

    // ------------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------------

    /// @notice Curated Agent-ID-gated ERC-721 collections counted for
    /// Collector badges. Removals never revoke already-minted badges.
    address[] public curatedCollections;
    mapping(address => bool) public isCuratedCollection;

    /// @notice minted[account][badgeType] — one badge per address per type,
    /// ever (burning does not restore eligibility to mint again).
    mapping(address => mapping(uint8 => bool)) public minted;

    /// @notice Per-type mint counters (also the serial for the next token id).
    mapping(uint8 => uint256) public badgeCount;

    /// @notice Total badges ever minted (monotonic; burns do not decrease it).
    uint256 public totalMinted;

    /// @notice Optional per-type SVG art override set by the owner.
    /// Empty string means "use the built-in art".
    mapping(uint8 => string) public artOverride;

    // ------------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------------

    event BadgeMinted(address indexed to, uint8 indexed badgeType, uint256 indexed tokenId);
    event CollectionAdded(address indexed collection);
    event CollectionRemoved(address indexed collection);
    event ArtUpdated(uint8 indexed badgeType);

    // ------------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------------

    error NotAgentIdHolder();
    error AlreadyMinted();
    error NotEligible();
    error InvalidBadgeType();
    error Soulbound();
    error ZeroAddress();
    error AlreadyCurated();
    error NotCurated();

    // ------------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------------

    /// @param owner_ The contract owner (curator admin: manages collections,
    /// art overrides, pause). Passed explicitly so the contract can be
    /// deployed through a factory (e.g. the CREATE2 deterministic deployment
    /// proxy), where msg.sender at construction would be the factory.
    /// @param agentId_ The Agent ID contract to gate on (BSC mainnet:
    /// 0x60b9262456de011f7d15a54cdd8c48baaa8b022f; on testnet a mock).
    /// @param initialCollections_ Curated collections to seed.
    constructor(address owner_, address agentId_, address[] memory initialCollections_)
        ERC721("AgentBadge", "AGBADGE")
        Ownable(owner_)
    {
        // Zero owner is already rejected by Ownable's own constructor
        // (OwnableInvalidOwner); no separate check needed here.
        if (agentId_ == address(0)) revert ZeroAddress();
        agentId = agentId_;
        for (uint256 i = 0; i < initialCollections_.length; i++) {
            _addCollection(initialCollections_[i]);
        }
    }

    // ------------------------------------------------------------------------
    // Minting
    // ------------------------------------------------------------------------

    /// @notice Mint a badge for the caller. Free except gas. The caller must
    /// hold an Agent ID and satisfy the badge's eligibility rule, and must
    /// not already own this badge type.
    /// @param badgeType One of 1..5 (see constants).
    function mint(uint8 badgeType) external whenNotPaused {
        if (badgeType < 1 || badgeType > NUM_BADGE_TYPES) revert InvalidBadgeType();
        if (!_holdsAgentId(msg.sender)) revert NotAgentIdHolder();
        if (minted[msg.sender][badgeType]) revert AlreadyMinted();
        if (!isEligible(msg.sender, badgeType)) revert NotEligible();

        minted[msg.sender][badgeType] = true;
        badgeCount[badgeType] += 1;
        totalMinted += 1;
        uint256 tokenId = uint256(badgeType) * TOKEN_ID_STRIDE + badgeCount[badgeType];
        _safeMint(msg.sender, tokenId);
        emit BadgeMinted(msg.sender, badgeType, tokenId);
    }

    /// @notice Burn your own badge. Burning does NOT restore eligibility to
    /// mint the same badge type again.
    function burn(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert Soulbound();
        _burn(tokenId);
    }

    // ------------------------------------------------------------------------
    // Eligibility (views — free to call)
    // ------------------------------------------------------------------------

    /// @notice Whether `account` currently satisfies a badge's rule.
    /// Does not check the one-per-address rule (use hasBadge for that).
    function isEligible(address account, uint8 badgeType) public view returns (bool) {
        if (badgeType < 1 || badgeType > NUM_BADGE_TYPES) return false;
        if (!_holdsAgentId(account)) return false;
        if (badgeType == VERIFIED_AGENT) return true;
        if (badgeType == EARLY_AGENT) return totalMinted < EARLY_AGENT_CAP;
        uint256 count = collectionCount(account);
        if (badgeType == COLLECTOR_I) return count >= COLLECTOR_I_THRESHOLD;
        if (badgeType == COLLECTOR_II) return count >= COLLECTOR_II_THRESHOLD;
        return count >= COLLECTOR_III_THRESHOLD; // COLLECTOR_III
    }

    /// @notice Whether `account` already owns a badge of this type.
    function hasBadge(address account, uint8 badgeType) external view returns (bool) {
        return minted[account][badgeType];
    }

    /// @notice Number of distinct curated collections `account` holds ≥1 NFT of.
    /// A collection whose balanceOf call fails counts as 0 (never bricks minting).
    function collectionCount(address account) public view returns (uint256 count) {
        uint256 len = curatedCollections.length;
        for (uint256 i = 0; i < len; i++) {
            try IERC721Balance(curatedCollections[i]).balanceOf(account) returns (uint256 bal) {
                if (bal > 0) count += 1;
            } catch {
                // Unreachable/broken collection: counts as not held.
            }
        }
    }

    /// @notice The badge type a token id belongs to.
    function badgeTypeOf(uint256 tokenId) public pure returns (uint8) {
        return uint8(tokenId / TOKEN_ID_STRIDE);
    }

    function _holdsAgentId(address account) internal view returns (bool) {
        try IERC721Balance(agentId).balanceOf(account) returns (uint256 bal) {
            return bal > 0;
        } catch {
            return false;
        }
    }

    // ------------------------------------------------------------------------
    // Soulbound — no transfers, no approvals
    // ------------------------------------------------------------------------

    /// @dev Only minting (from address(0)) and burning (to address(0)) are
    /// allowed. Every other transfer reverts.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function approve(address /*to*/, uint256 /*tokenId*/) public pure override {
        revert Soulbound();
    }

    function setApprovalForAll(address /*operator*/, bool /*approved*/) public pure override {
        revert Soulbound();
    }

    // ------------------------------------------------------------------------
    // Metadata — fully on-chain JSON + inline SVG
    // ------------------------------------------------------------------------

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        uint8 badgeType = badgeTypeOf(tokenId);
        string memory name = _badgeName(badgeType);
        string memory description = _badgeDescription(badgeType);
        string memory svg = bytes(artOverride[badgeType]).length > 0
            ? artOverride[badgeType]
            : _badgeSvg(badgeType);

        string memory json = string.concat(
            '{"name":"AgentBadge #',
            _toString(tokenId),
            unicode" — ",
            name,
            '","description":"',
            description,
            '","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Badge","value":"',
            name,
            '"},{"trait_type":"Type","value":"',
            _toString(badgeType),
            '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _badgeName(uint8 badgeType) internal pure returns (string memory) {
        if (badgeType == VERIFIED_AGENT) return "Verified Agent";
        if (badgeType == EARLY_AGENT) return "Early Agent";
        if (badgeType == COLLECTOR_I) return "Collector I";
        if (badgeType == COLLECTOR_II) return "Collector II";
        return "Collector III";
    }

    function _badgeDescription(uint8 badgeType) internal pure returns (string memory) {
        if (badgeType == VERIFIED_AGENT) {
            return "Proof that this wallet holds a Binance Agent ID. Soulbound achievement badge - no financial value.";
        }
        if (badgeType == EARLY_AGENT) {
            return "One of the first 100 AgentBadges ever minted. Soulbound achievement badge - no financial value.";
        }
        if (badgeType == COLLECTOR_I) {
            return "Holds NFTs from at least 1 curated Agent ID collection. Soulbound achievement badge - no financial value.";
        }
        if (badgeType == COLLECTOR_II) {
            return "Holds NFTs from at least 5 curated Agent ID collections. Soulbound achievement badge - no financial value.";
        }
        return "Holds NFTs from at least 10 curated Agent ID collections. Soulbound achievement badge - no financial value.";
    }

    function _badgeSvg(uint8 badgeType) internal pure returns (string memory) {
        (string memory bg, string memory accent, string memory label) = _badgeStyle(badgeType);
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">',
            '<rect width="512" height="512" rx="48" fill="', bg, '"/>',
            '<circle cx="256" cy="212" r="118" fill="none" stroke="', accent, '" stroke-width="10"/>',
            '<circle cx="256" cy="212" r="88" fill="', accent, '" opacity="0.25"/>',
            '<text x="256" y="232" font-family="sans-serif" font-size="72" font-weight="bold" fill="', accent, '" text-anchor="middle">',
            label,
            "</text>",
            '<text x="256" y="392" font-family="sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">',
            _badgeName(badgeType),
            "</text>",
            '<text x="256" y="436" font-family="sans-serif" font-size="20" fill="#cbd5e1" text-anchor="middle">AgentBadge | Soulbound | No financial value</text>',
            "</svg>"
        );
    }

    function _badgeStyle(uint8 badgeType)
        internal
        pure
        returns (string memory bg, string memory accent, string memory label)
    {
        if (badgeType == VERIFIED_AGENT) return ("#0f172a", "#38bdf8", unicode"✓");
        if (badgeType == EARLY_AGENT) return ("#1c1917", "#fbbf24", unicode"★");
        if (badgeType == COLLECTOR_I) return ("#022c22", "#34d399", "I");
        if (badgeType == COLLECTOR_II) return ("#1e1b4b", "#a78bfa", "II");
        return ("#3b0764", "#f472b6", "III");
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // ------------------------------------------------------------------------
    // Owner administration (disclosed permissions)
    // ------------------------------------------------------------------------

    /// @notice Add a curated collection (counts toward Collector badges).
    function addCollection(address collection) external onlyOwner {
        _addCollection(collection);
    }

    function _addCollection(address collection) internal {
        if (collection == address(0)) revert ZeroAddress();
        if (isCuratedCollection[collection]) revert AlreadyCurated();
        isCuratedCollection[collection] = true;
        curatedCollections.push(collection);
        emit CollectionAdded(collection);
    }

    /// @notice Remove a curated collection. Never revokes minted badges.
    function removeCollection(address collection) external onlyOwner {
        if (!isCuratedCollection[collection]) revert NotCurated();
        isCuratedCollection[collection] = false;
        uint256 len = curatedCollections.length;
        for (uint256 i = 0; i < len; i++) {
            if (curatedCollections[i] == collection) {
                curatedCollections[i] = curatedCollections[len - 1];
                curatedCollections.pop();
                break;
            }
        }
        emit CollectionRemoved(collection);
    }

    /// @notice Replace a badge type's SVG art (empty string restores built-in art).
    function setArtOverride(uint8 badgeType, string calldata svg) external onlyOwner {
        if (badgeType < 1 || badgeType > NUM_BADGE_TYPES) revert InvalidBadgeType();
        artOverride[badgeType] = svg;
        emit ArtUpdated(badgeType);
    }

    /// @notice Pause/unpause minting. Views and burns keep working while paused.
    function setPaused(bool paused) external onlyOwner {
        if (paused) _pause();
        else _unpause();
    }

    /// @notice Number of curated collections (for frontend pagination).
    function curatedCollectionCount() external view returns (uint256) {
        return curatedCollections.length;
    }

    // ------------------------------------------------------------------------
    // Safety: this contract is not meant to hold funds
    // ------------------------------------------------------------------------

    receive() external payable {
        revert Soulbound();
    }
}
