# LoanLedger

A simple Windows app to track money you've lent out — loans, weekly/monthly
interest, and principal paydowns — with everything stored locally on your PC.

It keeps itself up to date automatically: when a new version is published here,
the app shows an **"Update available"** prompt you can accept or postpone.

---

## ⬇️ Download & install (Windows)

1. Go to the **[Releases page](https://github.com/snehilmak/Claude/releases/latest)**.
2. Under **Assets**, download the installer ending in **`-setup.exe`**
   (e.g. `LoanLedger_0.1.0_x64-setup.exe`).
3. Double-click it and follow the prompts. That's it — LoanLedger opens when
   it's done, and you'll find it in the Start menu afterwards.

> **First-time Windows warning:** because the app isn't signed with a paid
> certificate yet, Windows may show a blue **"Windows protected your PC"**
> screen. Click **More info → Run anyway** to continue. (This goes away if we
> add code-signing later.)

After this, you never download manually again — the app updates itself.

---

## 💡 How to use it

- **Add a loan** — click **New loan**, enter the borrower, the principal
  (e.g. `380000`), and the interest rate and period (e.g. `1%` `weekly`).
- **See what's owed** — each loan shows its current balance and the interest due
  this period. A $380,000 loan at 1% weekly shows **$3,800** due this week.
- **Record a payment** — open a loan and log a payment, split into the
  **interest** received and any **principal** paid down. Paying down principal
  lowers the balance, so next period's interest drops automatically.
- **Dashboard** — see totals across all loans: outstanding principal, interest
  due this period, and interest collected so far.

## 💾 Your data & backups

- Everything is saved in a single file on your computer — nothing is sent
  online. The exact location is shown in **Settings**.
- The app makes an automatic backup every time it starts (keeping the last 10).
- Use **Settings → Back up now** to save a copy anywhere you like (USB stick, a
  cloud-synced folder, etc.).

---

## For developers

The app is built with [Tauri](https://tauri.app/) (Rust + React). Source,
build instructions, and the release process live in
**[`loanledger/`](loanledger/README.md)**.
