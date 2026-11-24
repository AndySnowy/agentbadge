# AgentBadge — Deploy Guide (GitHub Pages)

This folder (`docs/`, served by GitHub Pages) holds the whole AgentBadge front end: plain HTML, CSS, and
JavaScript. No build step, no framework, no server, no API keys. The files
are:

| File | What it is |
| --- | --- |
| `index.html` | The single-page app (Home / Mint / My Badges / Board) |
| `styles.css` | Dark theme, mobile-friendly |
| `app.js` | Wallet connect, eligibility checks, minting, stats, board |
| `config.js` | **The one file you edit**: contract address + network |
| `README-DEPLOY.md` | This guide |

## Before you publish: point the site at the contract

1. Deploy the contract to the **testnet** first (chain 97) and copy its address.
2. Open `config.js` and set:
   - `CONTRACT_ADDRESS` to the deployed address (it is currently the zero
     address, a placeholder — the site shows a "not deployed yet" banner
     until you fill it in).
   - Leave `IS_TESTNET: true` while testing.
3. When the mainnet contract (chain 56) is deployed and you want the live
   site to use it, set `CONTRACT_ADDRESS` to the mainnet address and
   `IS_TESTNET: false`, then re-upload `config.js`.

Nothing else needs editing. No secrets or API keys are involved anywhere —
the site only talks to public RPC endpoints and the visitor's own wallet.

## Publish on GitHub Pages (no command line needed)

1. Go to <https://github.com/new> and create a **public** repository. Suggested
   name: `agentbadge` (keep "binance" and "bnb" out of the name).
   Do not add a README, license, or .gitignore — the upload below provides
   the files.
2. On the new repo page, click **Add file → Upload files**, then drag in
   all five files from this folder (`index.html`, `styles.css`, `app.js`,
   `config.js`, `README-DEPLOY.md`). Click **Commit changes**.
3. Go to **Settings → Pages** (left sidebar, under "Code and automation").
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Under **Branch**, choose `main` and `/ (root)`, then click **Save**.
6. Wait about a minute, then open the Pages URL shown at the top of that
   page. It will look like:

   `https://YOUR-USERNAME.github.io/agentbadge/`

   (Replace `YOUR-USERNAME` with your GitHub username.)

That is the live site. Share that link in the hackathon submission.

### Alternative: publish with git

```bash
git init
git add index.html styles.css app.js config.js README-DEPLOY.md
git commit -m "AgentBadge frontend"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/agentbadge.git
git push -u origin main
```

Then do steps 3–6 above to enable Pages.

## Updating the live site later

Edit the file (usually just `config.js` after a deploy), then upload the
changed file again via **Add file → Upload files** (GitHub overwrites the
old copy), or `git push` if you used git. Pages rebuilds automatically in
about a minute.

## Preview locally before publishing

From this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser. With the placeholder
contract address you will see the "not deployed yet" banner, all four views
render, and the wallet button explains that no wallet is connected — that
is the expected pre-deploy state.

## Quick checklist after the contract deploys

- [ ] `config.js` has the real contract address; `IS_TESTNET` matches it.
- [ ] Home shows live "Badges collected" and "Holders" numbers.
- [ ] Mint page: connect a wallet on the right network, eligibility pills
      show for each badge, and a mint transaction confirms in the wallet.
- [ ] My Badges shows the minted badge with its on-chain art.
- [ ] Board lists the mint.
- [ ] Wrong-network test: switch the wallet to another chain and confirm
      the site shows the warning plus the switch-network button.
