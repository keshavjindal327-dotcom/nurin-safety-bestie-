# Firebase setup (free Spark plan - no Blaze, no Cloud Functions)

The site now talks straight to **Firestore** from the browser. Your `firestore.rules` do all the protection:
anyone can *create* a valid signup, only `keshavjindal327@gmail.com` (Google sign-in, email verified) can read/list/edit/delete.

## Already done in this zip
Your web config (project `nurin-safety-bestie`) is built into `src/lib/firebase.ts` and `.firebaserc`, so no `.env` is needed.

## Still to do in the Firebase Console (free)
1. **Firestore Database** created, and the rules published = the `firestore.rules` file in this zip.
2. **Authentication > Sign-in method > enable Google.**
3. **Authentication > Settings > Authorized domains** - add every domain the site runs on (your `*.vercel.app` / custom domain). `localhost`, `nurin-safety-bestie.web.app` and `.firebaseapp.com` are already there.

## Run / deploy
```bash
pnpm install
pnpm --filter @workspace/nurin-safety-bestie run dev
```
Deploy on **Firebase Hosting (free)**: `npm i -g firebase-tools`, then
`pnpm --filter @workspace/nurin-safety-bestie run build && firebase login && firebase deploy --only hosting,firestore:rules`.
Or keep using Vercel as is (just authorise its domain in step 3).

## Data model
Collection `earlyAccess`, document ID = the lower-cased email (one signup per email). Fields: firstName, email, audience,
purchaseInterest, priceFeeling, priorityFeature, feedback, consent, createdAt (server time).

## Good to know
- If someone signs up with an email that is already on the list, Firestore refuses the overwrite; the site shows the normal
  "You're on the list" screen (same as before).
- The old server-side rate limit no longer exists (no server). Rules still block bad/oversized data. For spam protection later, enable **Firebase App Check** (free).
- Old Postgres signups are not migrated; export their CSV from the old admin page first.
