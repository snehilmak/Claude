# LoanLedger

A lightweight Windows desktop app to track money you've lent out and the
interest/principal payments that come back. Built with **Tauri v2** (Rust core +
React UI), so installers are tiny (a few MB) and the app **auto-updates from
GitHub** — when you publish a new release, users get a "Update available" prompt
they can accept or postpone.

## What it does

- Track loans with a borrower name, principal, interest rate, and period
  (weekly or monthly).
- Example: a **$380,000** loan at **1% weekly** shows **$3,800** interest due
  this week. Record a principal paydown and the balance — and next week's
  interest — drop automatically.
- Record payments split into an **interest** portion (income) and a **principal**
  portion (reduces the balance).
- Dashboard with portfolio totals: outstanding principal, interest due this
  period, and interest collected to date.
- Projected interest schedule for upcoming periods.
- **Local-first storage** in a single SQLite file, with one-click manual backup
  and automatic rolling snapshots on every launch.

## Project layout

```
loanledger/
├─ src/              React + TypeScript UI
│  ├─ calc.ts        Pure loan math (unit-tested in calc.test.ts)
│  ├─ db.ts          SQLite data-access layer
│  ├─ system.ts      Update checks + backup bridges to native code
│  ├─ pages/         Dashboard, Loans, Settings
│  └─ components/     LoanForm, LoanDrawer, UpdateBanner
└─ src-tauri/        Rust core
   ├─ src/lib.rs     DB migrations + backup commands + plugin setup
   ├─ tauri.conf.json App config + updater public key + endpoint
   └─ capabilities/  Permissions for the window
```

The release workflow lives at `.github/workflows/loanledger-release.yml` (repo
root, since GitHub Actions must live there).

## Develop locally

Requires Node 18+ and the Rust toolchain, plus the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```bash
cd loanledger
npm install
npm test            # run the loan-math unit tests
npm run tauri dev   # launch the app with hot reload
```

> Day-to-day development and Windows builds are easiest **on Windows**. You can
> develop the UI on any OS, but the shippable `.exe` is produced by CI.

## One-time setup before the first release

The auto-updater verifies every update with a signing key. A keypair has already
been generated; the **public** key is committed in `tauri.conf.json`. You must
add the **private** key to the repo as GitHub Actions secrets so CI can sign
builds:

1. In GitHub: **Settings → Secrets and variables → Actions → New repository
   secret**.
2. Add `TAURI_SIGNING_PRIVATE_KEY` — paste the private key string (provided to
   you separately; it is **not** stored in the repo).
3. Add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — leave the value **empty** (the key
   was generated without a password).

> Keep the private key safe. If it's lost, you'd need to ship a new public key,
> and existing installs could no longer auto-update.

To regenerate a keypair yourself at any time:

```bash
cd loanledger
npx tauri signer generate --password "" -w loanledger.key
# Put the .pub contents into tauri.conf.json -> plugins.updater.pubkey
# Put the private key string into the GitHub secret above
```

## Cut a release (and trigger auto-update)

1. Bump the version in **both** `loanledger/package.json` and
   `loanledger/src-tauri/tauri.conf.json` (e.g. `0.1.0` → `0.2.0`).
2. Commit, then tag and push:
   ```bash
   git commit -am "Release v0.2.0"
   git tag loanledger-v0.2.0
   git push origin loanledger-v0.2.0
   ```
3. The **Release LoanLedger** workflow builds the Windows installer, signs it,
   and publishes a GitHub Release with the `.exe` and a `latest.json` manifest.
4. Open installs check `latest.json` on launch and prompt the user to update.

You can also run the workflow manually from the **Actions** tab via
**Run workflow** and supplying the tag.

## How auto-update works

- `tauri.conf.json` points the updater at
  `https://github.com/<owner>/<repo>/releases/latest/download/latest.json`.
- On launch the app fetches that manifest. If it lists a version newer than the
  running one, the in-app banner offers **Update now** / **Later**.
- "Later" snoozes that specific version; the prompt returns when an even newer
  release ships.
- Downloads are signature-verified against the embedded public key before
  installing, then the app relaunches into the new version.

> Note: because the endpoint tracks the repo's *latest* release, keep
> LoanLedger releases as the most recent published (non-prerelease) release.

## Data & backups

- Everything is stored in `loanledger.db` (a SQLite file) under the app's config
  directory. The exact path is shown in **Settings**.
- **Settings → Back up now** exports a copy anywhere you choose (USB, a synced
  cloud folder, etc.).
- On every launch the app writes a timestamped snapshot to a `backups/`
  subfolder and keeps the 10 most recent.
- Cloud backup/sync can be layered on later without changing this model.
