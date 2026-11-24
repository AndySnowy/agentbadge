/* AgentBadge — vanilla JS front end.
 *
 * No framework, no build step. Reads go through public RPC endpoints
 * (rotated on failure); writes go through the user's own injected wallet
 * (window.ethereum only — no QR login, no pairing codes, no session
 * storage, no WalletConnect).
 *
 * Everything degrades gracefully when the contract is not deployed yet:
 * the zero address in config.js is detected and all contract calls are
 * skipped, with a banner explaining the state.
 */
(function () {
  "use strict";

  var CFG = (typeof window !== "undefined" && window.AGENTBADGE_CONFIG) || null;
  var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  var BADGE_MINTED_TOPIC = null; // computed once ethers is available

  var state = {
    account: null,        // checksummed address string or null
    walletProvider: null, // ethers.BrowserProvider or null
    chainId: null,        // number or null
    statsLoaded: false,
    boardLoaded: false,
    myBadgesLoadedFor: null
  };

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function $(id) { return document.getElementById(id); }

  function network() {
    return CFG.NETWORKS[CFG.IS_TESTNET ? "testnet" : "mainnet"];
  }

  function isDeployed() {
    if (!CFG || !CFG.CONTRACT_ADDRESS) return false;
    var a = String(CFG.CONTRACT_ADDRESS).toLowerCase();
    return a !== ZERO_ADDRESS && a !== "";
  }

  function hasEthers() {
    return typeof window !== "undefined" && typeof window.ethers !== "undefined";
  }

  function shortAddress(addr) {
    if (!addr) return "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function logTx(msg) {
    var el = $("tx-log");
    if (!el) return;
    el.textContent += (el.textContent ? "\n" : "") + msg;
  }

  function clearTxLog() {
    var el = $("tx-log");
    if (el) el.textContent = "";
  }

  function badgeById(id) {
    for (var i = 0; i < CFG.BADGES.length; i++) {
      if (CFG.BADGES[i].id === id) return CFG.BADGES[i];
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Badge art (client-side preview art, same look as the on-chain SVG)   */
  /* ------------------------------------------------------------------ */

  function badgeSVG(badge) {
    var esc = escapeHtml(badge.name);
    var num = badge.id;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="' + esc + ' badge">' +
      "<defs>" +
      '<linearGradient id="g' + num + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="' + badge.color + '"/>' +
      '<stop offset="100%" stop-color="' + badge.colorDark + '"/>' +
      "</linearGradient>" +
      "</defs>" +
      '<rect width="400" height="400" rx="32" fill="#11151f"/>' +
      '<circle cx="200" cy="180" r="118" fill="url(#g' + num + ')" opacity="0.92"/>' +
      '<circle cx="200" cy="180" r="118" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="3"/>' +
      '<path d="M200 108l21 43 47 7-34 33 8 47-42-22-42 22 8-47-34-33 47-7z" fill="#0b0e14" opacity="0.85"/>' +
      '<text x="200" y="300" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="700" fill="#e8ecf4">' + esc + "</text>" +
      '<text x="200" y="336" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#9aa4b8">AgentBadge · Type ' + num + "</text>" +
      "</svg>"
    );
  }

  /* ------------------------------------------------------------------ */
  /* tokenURI decoding — the contract gives back data: JSON with inline SVG  */
  /* ------------------------------------------------------------------ */

  // Base64 -> UTF-8 string. Plain atob() returns Latin-1 bytes, which
  // mangles any multi-byte character (e.g. an em dash in a badge name),
  // so decode through TextDecoder where available, with a
  // decodeURIComponent fallback for environments that lack it.
  function b64ToUtf8(b64) {
    var bin = atob(b64);
    if (typeof TextDecoder !== "undefined") {
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
    var pct = "";
    for (var j = 0; j < bin.length; j++) {
      pct += "%" + ("0" + bin.charCodeAt(j).toString(16)).slice(-2);
    }
    return decodeURIComponent(pct);
  }

  // Input:  data:application/json;base64,{...image:"data:image/svg+xml;base64,..."}
  // Output: { name, description, image, svg, attributes }
  function decodeTokenURI(uri) {
    var JSON_PREFIX = "data:application/json;base64,";
    var SVG_B64_PREFIX = "data:image/svg+xml;base64,";
    var SVG_URI_PREFIX = "data:image/svg+xml,";
    if (typeof uri !== "string" || uri.indexOf(JSON_PREFIX) !== 0) {
      throw new Error("tokenURI is not a base64 data: JSON URI");
    }
    var json = JSON.parse(b64ToUtf8(uri.slice(JSON_PREFIX.length)));
    var svg = null;
    if (typeof json.image === "string") {
      if (json.image.indexOf(SVG_B64_PREFIX) === 0) {
        svg = b64ToUtf8(json.image.slice(SVG_B64_PREFIX.length));
      } else if (json.image.indexOf(SVG_URI_PREFIX) === 0) {
        svg = decodeURIComponent(json.image.slice(SVG_URI_PREFIX.length));
      }
    }
    // Only accept plain SVG markup — refuse anything carrying a script.
    if (svg !== null && (svg.indexOf("<svg") === -1 || svg.indexOf("<script") !== -1)) {
      svg = null;
    }
    return {
      name: json.name || "",
      description: json.description || "",
      image: json.image || "",
      svg: svg,
      attributes: Array.isArray(json.attributes) ? json.attributes : []
    };
  }

  /* ------------------------------------------------------------------ */
  /* Read path — public RPC, rotated on failure                          */
  /* ------------------------------------------------------------------ */

  function readContract(rpcUrl) {
    var provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(CFG.CONTRACT_ADDRESS, CFG.ABI, provider);
  }

  // Runs fn(contract, provider, rpcUrl) against each RPC in turn until one
  // succeeds. Gives back null (never throws) when every endpoint fails or the
  // contract is not deployed.
  async function withRead(fn) {
    if (!isDeployed() || !hasEthers()) return null;
    var lastErr = null;
    var urls = network().rpcUrls;
    for (var i = 0; i < urls.length; i++) {
      try {
        var provider = new ethers.JsonRpcProvider(urls[i]);
        var contract = new ethers.Contract(CFG.CONTRACT_ADDRESS, CFG.ABI, provider);
        return await fn(contract, provider, urls[i]);
      } catch (e) {
        lastErr = e;
      }
    }
    if (typeof console !== "undefined" && console.warn) {
      console.warn("AgentBadge: all read RPCs failed", lastErr);
    }
    return null;
  }

  function badgeMintedTopic() {
    if (!BADGE_MINTED_TOPIC) {
      BADGE_MINTED_TOPIC = ethers.id("BadgeMinted(address,uint8,uint256)");
    }
    return BADGE_MINTED_TOPIC;
  }

  // Best-effort scan of BadgeMinted events, walking back in chunks.
  // filterTo: optional address to restrict `to` (indexed topic 1).
  // Gives back { events: [{to, badgeType, tokenId, blockNumber}], scannedBlocks }
  // or null when the contract is not deployed / ethers is missing.
  async function scanMintEvents(filterTo) {
    if (!isDeployed() || !hasEthers()) return null;
    var urls = network().rpcUrls;
    for (var u = 0; u < urls.length; u++) {
      try {
        var provider = new ethers.JsonRpcProvider(urls[u]);
        var iface = new ethers.Interface(CFG.ABI);
        var latest = await provider.getBlockNumber();
        var events = [];
        var scanned = 0;
        var chunk = CFG.LOG_CHUNK_BLOCKS || 2000;
        var maxBack = CFG.LOG_MAX_BLOCKS_BACK || 50000;
        var toBlock = latest;
        var topics = [badgeMintedTopic()];
        if (filterTo) {
          topics.push(ethers.zeroPadValue(filterTo.toLowerCase(), 32));
        }
        while (toBlock > latest - maxBack && toBlock >= 0) {
          var fromBlock = Math.max(toBlock - chunk + 1, 0);
          var logs;
          try {
            logs = await provider.getLogs({
              address: CFG.CONTRACT_ADDRESS,
              topics: topics,
              fromBlock: fromBlock,
              toBlock: toBlock
            });
          } catch (e) {
            // Range too wide or endpoint grumpy — keep what we have.
            break;
          }
          scanned += (toBlock - fromBlock + 1);
          for (var i = 0; i < logs.length; i++) {
            try {
              var parsed = iface.parseLog(logs[i]);
              events.push({
                to: parsed.args[0],
                badgeType: Number(parsed.args[1]),
                tokenId: parsed.args[2].toString(),
                blockNumber: logs[i].blockNumber
              });
            } catch (e) { /* skip unparseable log */ }
          }
          if (fromBlock === 0) break;
          toBlock = fromBlock - 1;
        }
        events.sort(function (a, b) { return b.blockNumber - a.blockNumber; });
        return { events: events, scannedBlocks: scanned, latestBlock: latest };
      } catch (e) {
        // Try the next RPC endpoint.
      }
    }
    return { events: [], scannedBlocks: 0, latestBlock: null };
  }

  /* ------------------------------------------------------------------ */
  /* Stats                                                               */
  /* ------------------------------------------------------------------ */

  async function loadStats() {
    if (state.statsLoaded || !isDeployed() || !hasEthers()) return;
    state.statsLoaded = true;

    var total = await withRead(function (c) { return c.totalMinted(); });
    if (total !== null) {
      var t = total.toString();
      $("stat-total").textContent = t;
      var bt = $("board-total");
      if (bt) bt.textContent = t;
    } else {
      $("stat-total-note").textContent = "Contract read failed — try reloading";
    }

    var scan = await scanMintEvents(null);
    if (scan && scan.latestBlock !== null) {
      var holders = {};
      scan.events.forEach(function (e) { holders[e.to.toLowerCase()] = true; });
      var n = Object.keys(holders).length;
      $("stat-holders").textContent = String(n);
      var bh = $("board-holders");
      if (bh) bh.textContent = String(n);
    }

    // Per-badge minted counts on the home grid.
    var counts = await withRead(async function (c) {
      var out = {};
      for (var i = 0; i < CFG.BADGES.length; i++) {
        try {
          out[CFG.BADGES[i].id] = (await c.badgeCount(CFG.BADGES[i].id)).toString();
        } catch (e) { out[CFG.BADGES[i].id] = null; }
      }
      return out;
    });
    if (counts) {
      CFG.BADGES.forEach(function (b) {
        var el = document.querySelector('[data-count-for="' + b.id + '"]');
        if (el && counts[b.id] !== null) {
          el.textContent = counts[b.id] + " collected so far";
        }
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Rendering — static content                                          */
  /* ------------------------------------------------------------------ */

  function renderHomeBadges() {
    var grid = $("home-badge-grid");
    if (!grid) return;
    grid.innerHTML = "";
    CFG.BADGES.forEach(function (b) {
      var card = document.createElement("article");
      card.className = "badge-card";
      card.innerHTML =
        '<div class="art">' + badgeSVG(b) + "</div>" +
        "<h3>" + escapeHtml(b.name) + "</h3>" +
        '<p class="tagline">' + escapeHtml(b.tagline) + "</p>" +
        '<p class="rule"><strong>Rule:</strong> ' + escapeHtml(b.rule) + "</p>" +
        '<p class="minted-count" data-count-for="' + b.id + '"></p>';
      grid.appendChild(card);
    });
  }

  function renderCollections() {
    var list = $("collection-list");
    if (!list) return;
    list.innerHTML = "";
    CFG.COLLECTIONS.forEach(function (c) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.textContent = c.name;
      var addr = document.createElement("span");
      addr.className = "addr mono";
      addr.textContent = shortAddress(c.address);
      addr.title = c.address;
      li.appendChild(name);
      li.appendChild(addr);
      list.appendChild(li);
    });
  }

  function renderFooter() {
    var fc = $("footer-contract");
    if (fc) {
      fc.textContent = isDeployed()
        ? CFG.CONTRACT_ADDRESS
        : "not deployed yet";
    }
    var fn = $("footer-network");
    if (fn) {
      fn.textContent = network().name +
        " (chain " + network().chainId + ")" +
        (CFG.IS_TESTNET ? " — testnet" : "");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */

  function showView(name) {
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + name);
    });
    document.querySelectorAll("[data-nav]").forEach(function (btn) {
      if (btn.classList.contains("nav-btn")) {
        btn.classList.toggle("active", btn.getAttribute("data-nav") === name);
      }
    });
    if (name === "board") loadBoard();
    if (name === "mybadges") loadMyBadges();
    // Back to top on view switch (plain property sets work everywhere,
    // including embedded webviews that lack window.scrollTo).
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  /* ------------------------------------------------------------------ */
  /* Wallet — injected provider only                                     */
  /* ------------------------------------------------------------------ */

  function updateWalletChip() {
    var chip = $("wallet-chip");
    if (!chip) return;
    if (state.account) {
      chip.textContent = shortAddress(state.account);
      chip.classList.add("connected");
    } else {
      chip.textContent = "Wallet not connected";
      chip.classList.remove("connected");
    }
  }

  function updateNetworkStatus() {
    var el = $("network-status");
    var switchBtn = $("switch-network-btn");
    if (!el) return;
    var net = network();
    if (!state.account) {
      el.textContent = "";
      if (switchBtn) switchBtn.hidden = true;
      return;
    }
    if (state.chainId === net.chainId) {
      el.textContent = "Connected to " + net.name + ".";
      if (switchBtn) switchBtn.hidden = true;
    } else {
      el.textContent = "Your wallet is on the wrong network. AgentBadge needs " +
        net.name + " (chain " + net.chainId + ").";
      if (switchBtn) {
        switchBtn.hidden = false;
        switchBtn.textContent = "Switch to " + net.name;
      }
    }
  }

  async function connectWallet() {
    var status = $("connect-status");
    if (typeof window.ethereum === "undefined") {
      if (status) {
        status.textContent = "No browser wallet found. Install a wallet " +
          "extension (for example MetaMask) and reload this page — " +
          "AgentBadge only connects through the wallet in your browser.";
      }
      logTx("No injected wallet (window.ethereum) detected.");
      return;
    }
    if (!hasEthers()) {
      if (status) status.textContent = "The ethers.js library failed to load — reload the page and try again.";
      return;
    }
    try {
      if (status) status.textContent = "Waiting for your wallet — approve the connection request in the extension.";
      state.walletProvider = new ethers.BrowserProvider(window.ethereum);
      var accounts = await state.walletProvider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        if (status) status.textContent = "No account was shared. Try connecting again.";
        return;
      }
      state.account = ethers.getAddress(accounts[0]);
      var net = await state.walletProvider.getNetwork();
      state.chainId = Number(net.chainId);
      if (status) {
        status.textContent = "Connected as " + state.account + ".";
      }
      $("disconnect-btn").hidden = false;
      updateWalletChip();
      updateNetworkStatus();
      await refreshMintGrid();
      await loadMyBadges();
    } catch (e) {
      state.account = null;
      state.walletProvider = null;
      if (status) {
        status.textContent = "Connection was not completed. " +
          (e && e.code === 4001
            ? "You declined the request in your wallet."
            : "Try again, or check that your wallet extension is unlocked.");
      }
    }
  }

  function disconnectWallet() {
    // Nothing is stored anywhere — this only clears this page's view.
    // The wallet extension itself stays untouched.
    state.account = null;
    state.walletProvider = null;
    state.chainId = null;
    state.myBadgesLoadedFor = null;
    var status = $("connect-status");
    if (status) status.textContent = "No wallet connected. Connect with the wallet extension in your browser.";
    $("disconnect-btn").hidden = true;
    updateWalletChip();
    updateNetworkStatus();
    refreshMintGrid();
    loadMyBadges();
  }

  async function switchNetwork() {
    if (typeof window.ethereum === "undefined") return;
    var net = network();
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: net.chainIdHex }]
      });
    } catch (e) {
      // 4902: chain not added to the wallet — add it, then the wallet switches.
      if (e && e.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: net.chainIdHex,
              chainName: net.name,
              nativeCurrency: {
                name: CFG.IS_TESTNET ? "Test BNB" : "BNB",
                symbol: CFG.IS_TESTNET ? "tBNB" : "BNB",
                decimals: 18
              },
              rpcUrls: net.rpcUrls,
              blockExplorerUrls: [net.blockExplorer]
            }]
          });
        } catch (e2) {
          logTx("Could not add the network in your wallet: " + (e2 && e2.message ? e2.message : e2));
        }
      } else {
        logTx("Network switch was not completed. " +
          (e && e.code === 4001 ? "You declined the request in your wallet." : ""));
      }
    }
    // Re-read the chain in case the switch happened.
    if (state.walletProvider) {
      try {
        var n = await state.walletProvider.getNetwork();
        state.chainId = Number(n.chainId);
      } catch (e) { /* keep previous value */ }
    }
    updateNetworkStatus();
  }

  function listenToWalletEvents() {
    if (typeof window.ethereum === "undefined" || !window.ethereum.on) return;
    window.ethereum.on("accountsChanged", function (accounts) {
      if (!accounts || accounts.length === 0) {
        disconnectWallet();
      } else if (state.account) {
        state.account = accounts[0];
        updateWalletChip();
        refreshMintGrid();
        loadMyBadges();
      }
    });
    window.ethereum.on("chainChanged", function (chainIdHex) {
      state.chainId = parseInt(chainIdHex, 16);
      updateNetworkStatus();
      refreshMintGrid();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mint view                                                           */
  /* ------------------------------------------------------------------ */

  // Eligibility for one badge, via free eth_calls on the public RPC.
  async function checkBadge(badgeId) {
    if (!state.account) return { eligible: false, owned: false, unknown: true };
    var result = await withRead(async function (c) {
      var owned = await c.hasBadge(state.account, badgeId);
      var eligible = owned ? false : await c.isEligible(state.account, badgeId);
      return { eligible: eligible, owned: owned, unknown: false };
    });
    return result || { eligible: false, owned: false, unknown: true };
  }

  async function refreshMintGrid() {
    var grid = $("mint-badge-grid");
    if (!grid) return;
    var intro = $("mint-intro");
    grid.innerHTML = "";

    if (!isDeployed()) {
      if (intro) intro.textContent = "Minting opens once the contract is deployed.";
      CFG.BADGES.forEach(function (b) {
        grid.appendChild(mintCard(b, { eligible: false, owned: false, unknown: true }, true));
      });
      return;
    }
    if (!state.account) {
      if (intro) intro.textContent = "Connect your wallet to check eligibility. Eligibility checks are free reads — they cost no gas.";
      CFG.BADGES.forEach(function (b) {
        grid.appendChild(mintCard(b, { eligible: false, owned: false, unknown: true }, false));
      });
      return;
    }

    if (intro) intro.textContent = "Checking eligibility for " + shortAddress(state.account) + "…";
    var results = {};
    for (var i = 0; i < CFG.BADGES.length; i++) {
      results[CFG.BADGES[i].id] = await checkBadge(CFG.BADGES[i].id);
    }
    grid.innerHTML = "";
    var wrongNet = state.chainId !== null && state.chainId !== network().chainId;
    CFG.BADGES.forEach(function (b) {
      grid.appendChild(mintCard(b, results[b.id], wrongNet));
    });
    if (intro) {
      intro.textContent = wrongNet
        ? "Your wallet is on the wrong network — switch networks before minting."
        : "Eligibility is checked live from the contract. Minting sends one transaction per badge, which you confirm in your wallet.";
    }
  }

  function mintCard(badge, check, mintDisabled) {
    var card = document.createElement("article");
    card.className = "badge-card";

    var pill = "";
    var btnLabel = "Mint";
    var btnDisabled = true;
    if (!isDeployed()) {
      pill = '<span class="status-pill">Not deployed yet</span>';
      btnLabel = "Mint — not open yet";
    } else if (!state.account) {
      pill = '<span class="status-pill">Connect wallet to check</span>';
      btnLabel = "Mint";
    } else if (check.unknown) {
      pill = '<span class="status-pill">Could not check — try again</span>';
      btnLabel = "Mint";
    } else if (check.owned) {
      pill = '<span class="status-pill owned">Collected</span>';
      btnLabel = "Already collected";
    } else if (check.eligible) {
      pill = '<span class="status-pill eligible">Eligible</span>';
      btnDisabled = !!mintDisabled;
    } else {
      pill = '<span class="status-pill not-eligible">Not eligible yet</span>';
      btnLabel = "Not eligible";
    }

    card.innerHTML =
      '<div class="art">' + badgeSVG(badge) + "</div>" +
      "<h3>" + escapeHtml(badge.name) + "</h3>" +
      '<p class="tagline">' + escapeHtml(badge.tagline) + "</p>" +
      '<p class="rule"><strong>Rule:</strong> ' + escapeHtml(badge.rule) + "</p>" +
      pill;

    var btn = document.createElement("button");
    btn.className = "btn primary";
    btn.type = "button";
    btn.textContent = btnLabel;
    btn.disabled = btnDisabled;
    btn.addEventListener("click", function () { mintBadge(badge); });
    card.appendChild(btn);
    return card;
  }

  async function mintBadge(badge) {
    if (!state.account || !state.walletProvider) return;
    if (state.chainId !== network().chainId) {
      logTx("Wrong network — switch to " + network().name + " first.");
      return;
    }
    clearTxLog();
    logTx("Minting " + badge.name + " (type " + badge.id + ")…");
    logTx("Confirm the transaction in your wallet. There is no mint fee — you only pay network gas.");
    try {
      var signer = await state.walletProvider.getSigner();
      var contract = new ethers.Contract(CFG.CONTRACT_ADDRESS, CFG.ABI, signer);
      var tx = await contract.mint(badge.id);
      logTx("Transaction sent: " + tx.hash);
      logTx("Waiting for confirmation…");
      var receipt = await tx.wait();
      logTx("Confirmed in block " + receipt.blockNumber + ". " +
        badge.name + " is now in your wallet — view it under My Badges.");
      state.statsLoaded = false;
      state.boardLoaded = false;
      state.myBadgesLoadedFor = null;
      await refreshMintGrid();
      await loadStats();
      await loadMyBadges();
    } catch (e) {
      var msg = (e && e.message) || String(e);
      if (e && e.code === 4001) {
        logTx("You declined the transaction in your wallet. Nothing was minted.");
      } else if (/already|not eligible|paused/i.test(msg)) {
        logTx("The contract refused the mint: " + msg);
      } else {
        logTx("Mint failed: " + msg);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* My Badges                                                           */
  /* ------------------------------------------------------------------ */

  async function loadMyBadges() {
    var empty = $("mybadges-empty");
    var emptyText = $("mybadges-empty-text");
    var grid = $("mybadges-grid");
    if (!empty || !grid) return;

    if (!state.account) {
      grid.hidden = true;
      grid.innerHTML = "";
      empty.hidden = false;
      if (emptyText) emptyText.textContent = "Connect your wallet on the Mint page to see your badges here.";
      return;
    }
    if (!isDeployed()) {
      grid.hidden = true;
      grid.innerHTML = "";
      empty.hidden = false;
      if (emptyText) emptyText.textContent = "The contract is not deployed yet, so there are no badges to show.";
      return;
    }
    if (state.myBadgesLoadedFor === state.account) return;
    state.myBadgesLoadedFor = state.account;

    empty.hidden = false;
    if (emptyText) emptyText.textContent = "Loading your badges…";
    grid.hidden = true;
    grid.innerHTML = "";

    // Find this wallet's token ids from its BadgeMinted events, then read
    // each tokenURI for the on-chain art.
    var scan = await scanMintEvents(state.account);
    var owned = [];
    if (scan) {
      var seen = {};
      scan.events.forEach(function (e) {
        if (!seen[e.tokenId]) { seen[e.tokenId] = true; owned.push(e); }
      });
    }
    // Fall back to per-badge hasBadge checks when the event scan came back
    // empty (some RPCs refuse eth_getLogs) so owned badges still show.
    if (owned.length === 0) {
      for (var i = 0; i < CFG.BADGES.length; i++) {
        var has = await withRead(function (c) { return c.hasBadge(state.account, CFG.BADGES[i].id); });
        if (has) owned.push({ to: state.account, badgeType: CFG.BADGES[i].id, tokenId: null, blockNumber: null });
      }
    }

    if (owned.length === 0) {
      if (emptyText) emptyText.textContent = "No badges yet. Check the Mint page to see which ones you qualify for.";
      return;
    }

    empty.hidden = true;
    grid.hidden = false;
    for (var j = 0; j < owned.length; j++) {
      var badge = badgeById(owned[j].badgeType);
      if (!badge) continue;
      var card = document.createElement("article");
      card.className = "badge-card";
      var art = badgeSVG(badge);
      var name = badge.name;
      var desc = badge.tagline;
      if (owned[j].tokenId !== null) {
        try {
          var uri = await withRead((function (tid) {
            return function (c) { return c.tokenURI(tid); };
          })(owned[j].tokenId));
          if (uri) {
            var decoded = decodeTokenURI(uri);
            if (decoded.svg) art = decoded.svg;
            if (decoded.name) name = decoded.name;
            if (decoded.description) desc = decoded.description;
          }
        } catch (e) { /* keep the preview art */ }
      }
      var tokenLine = owned[j].tokenId !== null
        ? '<p class="minted-count">Token #' + escapeHtml(owned[j].tokenId) + "</p>"
        : '<p class="minted-count">Token id not available from the event scan</p>';
      card.innerHTML =
        '<div class="art">' + art + "</div>" +
        "<h3>" + escapeHtml(name) + "</h3>" +
        '<p class="tagline">' + escapeHtml(desc) + "</p>" +
        '<p class="rule"><strong>Badge:</strong> ' + escapeHtml(badge.name) + "</p>" +
        tokenLine;
      grid.appendChild(card);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Board                                                               */
  /* ------------------------------------------------------------------ */

  async function loadBoard() {
    if (state.boardLoaded || !isDeployed() || !hasEthers()) {
      if (!isDeployed()) {
        var note = $("board-note");
        if (note) note.textContent = "The contract is not deployed yet — the board will fill in once minting starts.";
      }
      return;
    }
    state.boardLoaded = true;
    var scan = await scanMintEvents(null);
    var empty = $("board-empty");
    var table = $("board-table");
    var body = $("board-body");
    var noteEl = $("board-note");
    if (!scan || scan.events.length === 0) {
      if (empty) { empty.hidden = false; empty.textContent = "No mints found in the scanned range."; }
      if (table) table.hidden = true;
      if (noteEl) noteEl.textContent = scan
        ? "Scanned the last " + scan.scannedBlocks.toLocaleString() + " blocks. Public RPCs limit how far back one scan can reach."
        : "The event scan failed on every public RPC — try reloading.";
      return;
    }
    if (empty) empty.hidden = true;
    if (table) table.hidden = false;
    if (body) {
      body.innerHTML = "";
      var shown = scan.events.slice(0, CFG.RECENT_MINTS_SHOWN || 20);
      shown.forEach(function (e) {
        var badge = badgeById(e.badgeType);
        var tr = document.createElement("tr");
        var badgeCell = document.createElement("td");
        badgeCell.textContent = badge ? badge.name : ("Type " + e.badgeType);
        var walletCell = document.createElement("td");
        walletCell.className = "mono";
        var link = document.createElement("a");
        link.href = network().blockExplorer + "/address/" + e.to;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = shortAddress(e.to);
        walletCell.appendChild(link);
        var tokenCell = document.createElement("td");
        tokenCell.className = "mono hide-mobile";
        tokenCell.textContent = "#" + e.tokenId;
        var blockCell = document.createElement("td");
        blockCell.className = "mono";
        blockCell.textContent = String(e.blockNumber);
        tr.appendChild(badgeCell);
        tr.appendChild(walletCell);
        tr.appendChild(tokenCell);
        tr.appendChild(blockCell);
        body.appendChild(tr);
      });
    }
    if (noteEl) {
      noteEl.textContent = "Showing " + Math.min(scan.events.length, CFG.RECENT_MINTS_SHOWN || 20) +
        " of " + scan.events.length + " mints found in the last " +
        scan.scannedBlocks.toLocaleString() + " blocks.";
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    if (!CFG) {
      var banner = $("ethers-banner");
      if (banner) {
        banner.hidden = false;
        banner.querySelector("p").textContent = "Configuration failed to load (config.js). Reload the page.";
      }
      return;
    }

    renderHomeBadges();
    renderCollections();
    renderFooter();
    refreshMintGrid();

    if (!hasEthers()) {
      var eb = $("ethers-banner");
      if (eb) eb.hidden = false;
    }

    if (!isDeployed()) {
      var db = $("deploy-banner");
      if (db) db.hidden = false;
      var mb = $("mint-deploy-banner");
      if (mb) mb.hidden = false;
    } else {
      loadStats();
    }

    document.querySelectorAll("[data-nav]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showView(btn.getAttribute("data-nav"));
      });
    });

    var connectBtn = $("connect-btn");
    if (connectBtn) connectBtn.addEventListener("click", connectWallet);
    var disconnectBtn = $("disconnect-btn");
    if (disconnectBtn) disconnectBtn.addEventListener("click", disconnectWallet);
    var switchBtn = $("switch-network-btn");
    if (switchBtn) switchBtn.addEventListener("click", switchNetwork);

    listenToWalletEvents();
  }

  // Test hooks (also lets the deploy checklist exercise decoding).
  if (typeof window !== "undefined") {
    window.__agentbadge = {
      decodeTokenURI: decodeTokenURI,
      badgeSVG: badgeSVG,
      shortAddress: shortAddress,
      isDeployed: isDeployed
    };
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
