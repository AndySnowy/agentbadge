# Agent ID Hackathon — Concept Evaluation

**Source:** Binance announcement, read in full 2026-11-19 (crawled 15:08 UTC):
https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf

## Verified facts (from the announcement, not from memory)

| Fact | Value |
|---|---|
| Submission period | 2026-11-18 08:00 UTC → **2026-12-09 08:00 UTC** |
| Internal review | 2026-12-09 → 2026-12-17; public review 2026-12-17 → 2026-12-20 |
| Rewards paid | Within 14 business days after public review ends, to the address given at submission |
| Total pool | **60,000 USDC** |
| Project Awards | $29,000, top 10 by on-chain metrics (interacting Agent ID addresses, tx volume/count). 1st $10,000 / 2nd $6,000 / 3rd $4,000 / 4th $3,000 / 5th $2,000 / 6th–10th $800 each |
| Innovation Award | $29,000, same tiers, judging panel 100-pt score |
| Innovation eligibility | Product **live** + **≥30 Agent ID addresses interacted** with the submitted contract(s) during the submission period |
| One award per project | Yes; the 20 project winners also get a two-digit Agent ID claim spot |
| Promotion Award | 20 winners share $2,000 ($100 each) for original X posts about a participating project, hashtags #BinanceWalletHackathon #AgenticWallet, link submitted via Binance survey |
| Judging (Innovation) | Agent ID depth **30%**, practicality & feasibility **25%**, product completion **25%**, innovation **20%** |
| Requirements | BNB Chain deployment, source verified + open-source on BscScan, actively uses Agent ID, one project per team, no registration needed |
| Red lines | No web QR-code login; no bypassing user confirmation; no unauthorized transfers; open-source with disclosed owner permissions; no "Binance"/"BNB" brand impersonation; no credential collection; **no promised returns** ("passive income" / "automatic money-making" banned); trading products need risk warnings; Agent ID must not be packaged as a wallet-lookup tool; no volume manipulation / fake accounts |
| Agent ID contract | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`, SPACE ID, ERC-721, symbol "AI", non-transferable. `balanceOf(addr) > 0` = holds an ID |

**Verified on-chain 2026-11-19 ~22:15 WIB (3 RPCs agree):**
- Our wallet `0xEc8E…Be2` BNB balance: **0.002082 BNB** (~$1.23 at live WBNB $591.32, DexScreener)
- BSC gas price: **0.05 gwei** — deployment is nearly free (see cost table below)
- Agent ID contract: `balanceOf(our wallet) = 1` ✓, `symbol() = "AI"` ✓

**Market context (web search 2026-11-19):**
- Agent ID claims passed **100,000** (Binance Wallet X, 2026-10-25). 30 users = 0.03% of holders — the users exist; reaching them is the problem, not their existence.
- Known competitor: **GLOOP** (3,333 free-mint slimes for Agent ID wallets, sold out 2026-11-08, Sourcify-verified, already submitted). Existing projects with established communities are competing — a brand-new project will **not** win the metrics-based Project Awards (top 10 by interacting addresses/volume). The Innovation Award is the realistic target.
- The announcement contains **no submission form link**. Finding the submission channel (likely a Binance survey or ecosystem page) is an open task for the build phase, deadline Dec 9.

## Gas cost reality (live prices, 2026-11-19)

| Operation | Gas | @ 0.05 gwei (now) | @ 0.1 gwei | @ 1 gwei (20× spike) |
|---|---|---|---|---|
| Deploy ~1.2M-gas contract | ~1,200,000 | 0.00006 BNB (~$0.04) | 0.00012 BNB | 0.0012 BNB |
| User mint tx | ~150,000 | 0.000008 BNB (~$0.005) | 0.000015 BNB | 0.00015 BNB |
| Simple tx | ~100,000 | 0.000005 BNB | 0.00001 BNB | 0.0001 BNB |

**Conclusion: gas is NOT a blocker.** Even a 20× gas spike leaves a deploy affordable from the 0.002082 BNB balance. The real constraints are (1) reaching 30 real users and (2) build quality. BscScan/Sourcify verification is free.

---

## Concept A — AgentBadge: soulbound achievement badges for Agent ID holders ⭐ RECOMMENDED

**What it is:** A single ERC-721 contract minting **non-transferable (soulbound) badges** that prove verifiable on-chain achievements of an Agent ID holder. Every function requires the caller to hold an Agent ID. Badge types (all free, gas only, ~$0.005 per mint):

1. **Verified Agent** — holds an Agent ID (`balanceOf > 0`). Everyone qualifies; the onboarding badge.
2. **Early Agent** — one of the first 100 badges ever minted. Scarcity hook.
3. **Collector I / II / III** — holds NFTs from ≥1 / ≥5 / ≥10 distinct curated Agent-ID-gated collections (checked on-chain via `balanceOf` on each collection contract, e.g. Ptah Relics, Agentic404 mirror, GLOOP).
4. (Stretch) **Mint Hunter** — holds ≥3 distinct free-mint collections from a second curated list.

One badge per address per type. Metadata is on-chain SVG art (no IPFS dependency, no server). A static frontend lets anyone connect a wallet, check eligibility (free read calls), mint, and view their badges + a holder board.

**Why Agent ID is core, not a gimmick:** the badge *is* an identity credential — it only has meaning because it is bound to a non-transferable `.ai` identity. Without Agent ID there is no product. Projects can later gate perks/allowlist spots on badge ownership, which is a genuine ecosystem primitive (portable on-chain agent reputation — nothing like it exists for Agent ID today).

| Criterion (weight) | Score | Reasoning |
|---|---|---|
| Agent ID depth (30%) | **26/30** | Agent ID gates every function and is the product's entire meaning; eligibility is verified on-chain against the Agent ID contract |
| Practicality & feasibility (25%) | **20/25** | Real need (agent reputation is unportable today); single contract + static site, no oracle, no server, no user funds at risk |
| Product completion (25%) | **22/25** | Fully shippable in days; live + complete core features well before Dec 9 |
| Innovation (20%) | **14/20** | Soulbound badges exist, but Agent-ID-native reputation with on-chain-verified collection criteria is new to this ecosystem |
| **Total** | **82/100** | |

**30-user gate — honest assessment:** BEST of the three concepts. The interaction is free (gas ~$0.005), fun (a shareable flex), and targets exactly the free-mint-hunter crowd who already hold Agent IDs and love minting things. Reachable channels: the user's X, GLOOP/Ptah/Agentic404 communities (their holders are the target audience by definition), BNB Chain / Binance Wallet community channels, replies to @BinanceWallet hackathon posts. Needed pace: ~2–3 real minters/day over ~14 days. **Estimated chance of reaching 30 with sustained outreach: 55–65%.** Not guaranteed — X reach is small and unknown — but it is the only concept where the product itself is the incentive (no one has to spend money or trust us with funds).

**Gas:** deploy ~0.00006–0.00012 BNB; user mint ~$0.005. **Build effort:** 3–5 days (contract + tests + frontend), then ~2 weeks promotion.

**Red lines:** clean. No user funds, no approvals, no QR login (standard injected-wallet connect only), no promised returns (badges are explicitly non-financial collectibles with no value promise), no Binance/BNB branding (name: "AgentBadge" — descriptive use of "Agent ID" as the platform term is what the hackathon itself asks for).

---

## Concept B — MintBoard: Agent ID-gated free-mint claim board

**What it is:** An on-chain registry of verified free mints (curated list: contract, price 0, deadline, quota). Agent ID holders "check in" on-chain after claiming a mint elsewhere; check-ins build a streak/score. A static frontend shows live free mints with verification status.

**The structural problem:** the actual mint happens on each project's own contract, not through ours — our contract only records check-ins. Agent ID gates a *logbook entry*, not the core action. Routing mints through a generic proxy was considered and rejected: arbitrary calldata forwarding is red-line-adjacent (bundled-transfer risk) and each mint has a different function signature.

| Criterion (weight) | Score | Reasoning |
|---|---|---|
| Agent ID depth (30%) | **16/30** | Agent ID gates check-ins, but the real value (the mint) happens elsewhere; judges will likely see the integration as shallow |
| Practicality & feasibility (25%) | **22/25** | Real need — free-mint discovery is genuinely painful — but listings go stale fast and need daily curation |
| Product completion (25%) | **19/25** | Shippable, but "complete" depends on a fresh listing feed, which is ongoing manual work, not a finished product |
| Innovation (20%) | **11/20** | Mint aggregators exist; the check-in twist is minor |
| **Total** | **68/100** | |

**30-user gate:** moderate (45–55%). Same audience as Concept A, but the interaction (check-in) is less fun than minting a badge, and the value proposition ("log your mints") is weaker than "own a badge". Also a points/streak system must be worded carefully to avoid implying future value (red line on promised returns).

**Gas:** deploy ~0.00006–0.00012 BNB. **Build effort:** 4–6 days + daily curation burden through Dec 9.

---

## Concept C — AgentTip: tip any Agent ID + task escrow

**What it is:** Send BNB/USDT tips to an `.ai` name (resolve name → address via the SPACE ID registry), plus optional escrow: lock payment for an agent task, released on completion.

| Criterion (weight) | Score | Reasoning |
|---|---|---|
| Agent ID depth (30%) | **25/30** | Name resolution is genuinely core — payments are even listed as an example use case in the announcement |
| Practicality & feasibility (25%) | **14/25** | Tipping works already via plain transfers; escrow needs dispute resolution, and a centralized arbiter is a trust problem while no arbiter means stuck funds |
| Product completion (25%) | **17/25** | Resolution integration + escrow logic + frontend is the heaviest build of the three |
| Innovation (20%) | **11/20** | Tipping and escrow are well-trodden; the `.ai` addressing is the only novel layer |
| **Total** | **67/100** | |

**30-user gate:** WEAKEST (15–25%). Requires 30 strangers to spend real money with no return and no fun hook. Tipping someone else's agent is not something people do on a dare.

**Gas:** deploy ~0.00008–0.00015 BNB. **Build effort:** 5–7 days.

**Red-line caution:** touches user assets (extra care needed on confirmation flows), and the "Agent ID must not be packaged as a tool for looking up other people's wallets by name" rule makes name→address resolution optics risky, even though payments are a sanctioned use case.

---

## Ruled out — Gasless claim relayer

A relayer that pays users' gas for free-mint claims. **Rejected:** we hold 0.002082 BNB total and cannot fund gas for 30 users' claims; it invites sybil abuse (free gas = free farming); a funded relayer key is an ops/security burden; and a server placing transactions on users' behalf sits uncomfortably close to the "no storing login sessions / placing orders on users' behalf" red line.

---

## Recommendation

**Build Concept A — AgentBadge.**

1. Highest judged score (82/100) with the strongest Agent ID depth (30% weight).
2. Best shot at the 30-user gate: free, fun, near-zero gas for users, and the product itself is the incentive.
3. Cheapest and fastest to build (3–5 days), leaving ~2 weeks for promotion — which is where this hackathon is actually won or lost.
4. Cleanest red-line profile: no user funds, no approvals, no promises.
5. Leaves a real artifact afterward: a reputation primitive other Agent ID projects can build on (gating, allowlists), which is also the story the judges want to hear.

**Honest caveat:** even the best concept's 30-user gate is a coin flip weighted by outreach effort, not code quality. If promotion stalls, the fallback value is (a) the Promotion Award route ($100 for an X post — see FEASIBILITY.md) and (b) a shipped, verified, open-source project that can be reused for future Agent ID campaigns.
