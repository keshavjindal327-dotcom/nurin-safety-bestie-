# NURIN — Safety Bestie early-access site

A market-validation website for **Safety Bestie**, a *proposed* personal-safety keychain concept (not yet built or tested). Visitors can learn about the idea and register interest for free; the answers help NURIN measure real demand.

## Run & operate

- `pnpm --filter @workspace/nurin-safety-bestie run dev` — website
- `pnpm run typecheck` — typecheck everything
- Storage is **Firestore directly from the browser** (no backend). Setup, rules and deploy: see `FIREBASE_SETUP.md`.

## Seeing who signed up

Go to **`/admin`**, sign in with the admin Google account (the one named in `firestore.rules`), and you get summary counts, a full table and **Download CSV**.

## Guardrails (keep in all copy)

Safety Bestie is a concept in development. SOS, emergency-contact messaging and location sharing are **proposed, unvalidated** features. The list is an expression of interest — **not** a purchase or preorder. Never promise protection, emergency response, availability or functionality. Signup data is never sold or shown publicly. See `.agents/memory/safety-bestie-guardrails.md`.

## Where things live

- Website: `artifacts/nurin-safety-bestie/src/App.tsx` (home + form), `pages/admin.tsx`
- Firestore access: `artifacts/nurin-safety-bestie/src/lib/signups.ts`, rules: `firestore.rules`
- Firebase init: `src/lib/firebase.ts` · API contract: `lib/api-spec/openapi.yaml`

## 2-minute demo script (for competitions)

1. **Hero (15s)** — "Safety that stays close." State up front: this is a concept we're validating, not a finished device.
2. **Problem → solution (20s)** — Why reaching for help is hard under stress; one physical press as the proposed answer.
3. **Three proposed features (20s)** — One-Press SOS Alert, Emergency Contact Messaging, Smartphone-assisted Location Sharing.
4. **Price & audience (15s)** — ≈ ₹2,600 proposed, not final; women, students, commuters, parents.
5. **Live signup (30s)** — Fill the form: it asks features, price reaction, and what builds trust. Submit.
6. **Admin (20s)** — Open `/admin`: the entry is there with summary tallies; click **Download CSV**. "This is how we turn interest into evidence."
