# FairCam — Proof of Human Photography
**faircam.io** | Built for the World × Coinbase × XMTP Hackathon

---

## What it does

FairCam lets a verified human capture a photo that carries cryptographic proof of:
- **Who** took it (World ID nullifier — anonymous but unique)
- **When** it was taken (ISO timestamp, embedded in Fairmark)
- **Where** it was taken (GPS coordinates)

A **Fairmark** (QR code overlay) is burned into the image. Anyone who scans it lands on a verification page showing the full trust report. Full-resolution access requires a $1 USDC payment via Coinbase x402.

---

## Demo Flow

1. Go to `https://faircam.io`
2. Click **Verify with World ID** → scan QR in World App
3. Camera opens → click **Capture FairPhoto**
4. Fairmark QR is embedded into the image automatically
5. Land on `/result/[id]` — share the link or scan the QR
6. Anyone opening `/verify/[id]` sees the trust report + blurred preview
7. Click **Unlock Full Image — $1 USDC** → payment processes → full image revealed

---

## Setup: Step by Step

### 1. Run the Supabase SQL

Go to your Supabase project → **SQL Editor** → paste contents of `supabase-setup.sql` → click **Run**.

This creates the `photos` table. Do this before pushing code.

### 2. Create the World ID Action

Go to **developer.worldcoin.org** → your FairCam app → **World ID** tab → **Actions** tab → **Create action**:
- Action name: `verify-human`
- Max verifications per user: `1` (or unlimited for demo)

### 3. Set environment variables

The `.env.local` file is already configured with your real credentials.
**Never commit `.env.local` to Git** — it's in `.gitignore`.

For Vercel, env vars are already set in your project dashboard.

### 4. Push code to GitHub

```bash
cd faircam

# If first time:
git init
git remote add origin https://github.com/fairnomics/faircam.git
git checkout -b main

# Every time:
git add -A
git commit -m "deploy: faircam prototype"
git push origin main
```

Vercel auto-deploys on every push to `main`.

### 5. Connect faircam.io domain in Vercel

1. Vercel dashboard → your project → **Settings → Domains**
2. Add `faircam.io` and `www.faircam.io`
3. In your domain registrar DNS settings, add:
   - `A` record: `@` → `76.76.21.21`
   - `CNAME` record: `www` → `cname.vercel-dns.com`
4. Wait 5–15 minutes for propagation
5. SSL is automatic

### 6. Run locally (optional)

```bash
npm install
npm run dev
```
Open http://localhost:3000

---

## File Structure

```
faircam/
├── pages/
│   ├── index.tsx              ← Capture page (verify + camera)
│   ├── result/[id].tsx        ← Post-capture result page
│   ├── verify/[id].tsx        ← Public verification + payment page
│   └── api/
│       ├── photos.ts          ← POST: save photo to Supabase
│       ├── photo/[id].ts      ← GET: fetch photo (guards full image)
│       ├── pay/[id].ts        ← POST: mock x402 payment → unlock
│       └── verify-world.ts    ← POST: World ID proof verification
├── lib/
│   └── supabase.ts            ← Supabase client + DB helpers
├── styles/
│   └── globals.css            ← Design system
├── supabase-setup.sql         ← Run once in Supabase SQL Editor
└── .env.local                 ← Real credentials (never commit)
```

---

## Credentials Summary

| Service | Account | Notes |
|---|---|---|
| World ID | developer.worldcoin.org / Fairmark team | App: FairCam |
| Supabase | supabase.com / fairnomics org | Project: faircam |
| Vercel | vercel.com / fairnomics | Project: faircam |
| GitHub | github.com/fairnomics | Repo: faircam |
| Domain | faircam.io | Point DNS to Vercel |

---

## Upgrading x402 to Real Payments

The payment is currently simulated. To wire real USDC on Base:

1. `npm install @coinbase/x402`
2. Add `X402_PAY_TO_ADDRESS=0xYourWalletAddress` to env vars
3. Replace the mock in `pages/api/pay/[id].ts` with real x402 verification

Docs: https://docs.cdp.coinbase.com/x402/welcome

---

Built with World ID · Coinbase x402 · Next.js · Supabase · faircam.io
