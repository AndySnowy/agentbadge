// AgentBadge — single configuration file.
// Fill in CONTRACT_ADDRESS after the contract is deployed (testnet first,
// then mainnet). Everything else in the app reads from this file.

window.AGENTBADGE_CONFIG = {

  // ------------------------------------------------------------------
  // CONTRACT — BSC mainnet, deployed 2026-11-24 (block 135403334).
  // Tx: 0x57c75263bd13cebe1abf99439ab4ec84f57e7d4380eea05d4297200a5809aa06
  // ------------------------------------------------------------------
  CONTRACT_ADDRESS: "0xb7A1FdfDdF6c1Af4A53521670C516c7D8c947C89",

  // Set to false when pointing the site at mainnet (chain 56).
  // While true, the app uses chain 97 and the testnet RPC list below.
  IS_TESTNET: false,

  // ------------------------------------------------------------------
  // NETWORKS
  // ------------------------------------------------------------------
  NETWORKS: {
    mainnet: {
      chainId: 56,
      chainIdHex: "0x38",
      name: "BNB Smart Chain",
      rpcUrls: [
        "https://bsc-dataseed.binance.org",
        "https://bsc-dataseed1.binance.org",
        "https://bsc.publicnode.com"
      ],
      blockExplorer: "https://bscscan.com"
    },
    testnet: {
      chainId: 97,
      chainIdHex: "0x61",
      name: "BNB Smart Chain Testnet",
      rpcUrls: [
        "https://data-seed-prebsc-1-s1.binance.org:8545",
        "https://data-seed-prebsc-2-s1.binance.org:8545",
        "https://bsc-testnet.publicnode.com"
      ],
      blockExplorer: "https://testnet.bscscan.com"
    }
  },

  // ------------------------------------------------------------------
  // CONTRACT ABI — minimal interface, matches the AgentBadge contract.
  // ------------------------------------------------------------------
  ABI: [
    "function mint(uint8 badgeType)",
    "function isEligible(address account, uint8 badgeType) view returns (bool)",
    "function hasBadge(address account, uint8 badgeType) view returns (bool)",
    "function collectionCount(address account) view returns (uint256)",
    "function badgeCount(uint8 badgeType) view returns (uint256)",
    "function totalMinted() view returns (uint256)",
    "function curatedCollections() view returns (address[])",
    "function badgeTypeOf(uint256 tokenId) view returns (uint8)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "event BadgeMinted(address indexed to, uint8 indexed badgeType, uint256 indexed tokenId)"
  ],

  // ------------------------------------------------------------------
  // BADGES — type id, name, rule, accent colour.
  // ------------------------------------------------------------------
  BADGES: [
    {
      id: 1,
      name: "Verified Agent",
      tagline: "You hold an Agent ID.",
      rule: "Hold an Agent ID.",
      color: "#38bdf8",
      colorDark: "#0369a1"
    },
    {
      id: 2,
      name: "Early Agent",
      tagline: "Among the first one hundred badges.",
      rule: "Hold an Agent ID and mint while fewer than 100 badges exist in total.",
      color: "#fbbf24",
      colorDark: "#92400e"
    },
    {
      id: 3,
      name: "Collector I",
      tagline: "First steps as a collector.",
      rule: "Hold an Agent ID and NFTs from at least 1 of the 12 curated collections.",
      color: "#a78bfa",
      colorDark: "#5b21b6"
    },
    {
      id: 4,
      name: "Collector II",
      tagline: "A growing shelf of collections.",
      rule: "Hold an Agent ID and NFTs from at least 5 of the 12 curated collections.",
      color: "#34d399",
      colorDark: "#065f46"
    },
    {
      id: 5,
      name: "Collector III",
      tagline: "A wide-ranging collector.",
      rule: "Hold an Agent ID and NFTs from at least 10 of the 12 curated collections.",
      color: "#f472b6",
      colorDark: "#9d174d"
    }
  ],

  // ------------------------------------------------------------------
  // CURATED COLLECTIONS (BSC mainnet, all verified ERC-721).
  // Shown on the home page so visitors can see what counts.
  // ------------------------------------------------------------------
  COLLECTIONS: [
    { name: "Ptah Relics",          address: "0xe8C6b38b5E63377a96b268319b66638f772254bb" },
    { name: "Agentic404 Mirror",    address: "0xc6d38bc5D854fDA20bD4473e9f3D0486747C178C" },
    { name: "GLOOP",                address: "0x587C303982187Ec578dF309d27670327b13202F8" },
    { name: "AgentsEstates",        address: "0x439643cfd023c247519518B7F73d06823E1F2fCe" },
    { name: "Ripstack Origin",      address: "0x72376F145c3e6af620b2aBEA259F9193460643Bd" },
    { name: "UNSOLVABLE",           address: "0x9e95Da84f1bcc8E5570DAAc99A37EB3f95270904" },
    { name: "Dreadnought",          address: "0x8d0619c59418ed042e43838bb6e83038303d27f6" },
    { name: "AgentEcho",            address: "0xff2dac2389a6a9593209b6008d5ffa9e73aa19c2" },
    { name: "PXIO Miners",          address: "0x58e8f1b34B60687B36BCdc78e02a2fd443De71Ab" },
    { name: "Chip404",              address: "0xAB6b18C626daaDd1ff7Cc45F402141153a5a9759" },
    { name: "Boltbook PodMint",     address: "0x74164ED868bFaD68eAAffA36f828019456D520DA" },
    { name: "Slimelings",           address: "0x3815A26a6981BAAd0b850f7522B7a8BDDdB6B70C" }
  ],

  // How far back the Board looks for recent mints (blocks). Public RPCs
  // cap eth_getLogs ranges, so the app walks back in chunks and stops on
  // the first error — best effort, never a crash.
  LOG_CHUNK_BLOCKS: 2000,
  LOG_MAX_BLOCKS_BACK: 50000,
  RECENT_MINTS_SHOWN: 20
};
