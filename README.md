# BOM Part List

A React + Firebase web app for managing electrical/automation parts (PLC, HMI, Breaker, Cable, etc.) by category. Initial data is seeded from the source Google Sheet.

## Features

- Browse parts by category (sidebar)
- Search across description / part number / brand
- Add new parts via a form
- Add new categories on the fly
- Delete parts
- One-click seed from the original spreadsheet (249 parts across 21 categories)
- Real-time updates via Firestore `onSnapshot`
- **AI BOM Assistant** — a rule-guided chat that helps pick items on a BOM (see below)

## AI BOM Assistant

Open any BOM and click **AI Assist** in the header to dock a chat panel on the right.

The assistant is **deterministic and grounded** — it never free-generates a bill of
materials. It only acts on rules and knowledge you teach it:

- **Teach rules** (the *Teach* button → *Rules* tab): each rule maps **trigger phrases**
  (e.g. `plc`, `control panel`) to **filters** (category / brand / part number /
  description text) that select real parts from your library. A rule can require a
  detail (brand, category, quantity) — if the request doesn't include it, the assistant
  **asks you first** instead of guessing.
- **Teach knowledge** (*Knowledge* tab): official facts/standards the assistant cites as
  **references** next to its suggestions.
- **How it answers:** it shows a transparent *Thinking* trace, cites the rules/knowledge
  it used, and when the request matches, lists candidate parts with **checkboxes**
  (select/unselect all, per-item quantity). Tick what you want and **Add** them to the BOM.
- If nothing matches, it says so and asks you to rephrase or teach a rule — it will not
  invent parts.

Rules and knowledge are stored in the `aiRules` and `aiKnowledge` Firestore collections
and shared across users of the app.

## Tech stack

- React 18 + Vite
- Firebase Firestore (database)
- Firebase Hosting (deploy target)

## One-time setup

### 1. Create a Firebase project

1. Go to https://console.firebase.google.com → **Add project**
2. **Build → Firestore Database → Create database** → start in **test mode**, pick a region (e.g. `asia-southeast1`)
3. In **Project settings → General → Your apps**, click the **`</>`** Web icon, register an app, and copy the `firebaseConfig` block.

### 2. Add your Firebase config

Open [`src/firebase.js`](src/firebase.js) and replace the placeholder values with your real config:

```js
const firebaseConfig = {
  apiKey: '...',
  authDomain: '....firebaseapp.com',
  projectId: '...',
  storageBucket: '....appspot.com',
  messagingSenderId: '...',
  appId: '...',
};
```

### 3. Install dependencies

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Opens at http://localhost:5173. On first load you'll see a banner — click **Seed initial data** to import the 249 parts. (Safe: the seed refuses to run if the `parts` collection isn't empty.)

### Run offline with mock data (no Firebase / no Google sign-in)

To try the app in a container or CI where Google sign-in and Firestore aren't
reachable:

```bash
npm run dev:mock
```

`dev:mock` sets `VITE_MOCK=1`, which aliases `firebase/auth` and
`firebase/firestore` to in-memory shims (`src/mocks/`). It auto-signs-in a fake
user (bypassing the Google popup) and seeds the store from `seed-data.json` plus
a demo BOM and starter AI rules/knowledge — so the **AI Assist** panel is usable
immediately. Nothing touches the real backend, and the flag is **never** set in
production builds, so `npm run build` always uses the real Firebase SDK.

## Deploy to Firebase Hosting

```bash
# one-time
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc   # edit, put your project id
firebase init hosting                # optional — firebase.json is already configured

# every deploy
npm run deploy
```

The app will be live at `https://<your-project>.web.app`.

## Project structure

```
bom-item-list/
├── src/
│   ├── firebase.js               # Firebase config (edit this!)
│   ├── main.jsx                  # React entry
│   ├── App.jsx                   # main UI: sidebar + table
│   ├── seed.js                   # imports seed-data.json into Firestore
│   ├── styles.css
│   └── components/
│       └── AddPartModal.jsx
├── public/
│   └── seed-data.json            # 249 parts from the source sheet
├── seed-data.json                # source copy (same content)
├── firebase.json                 # Hosting config (deploys ./dist)
├── vite.config.js
└── package.json
```

## Firestore schema

**`categories`** collection — `{ name: string, createdAt: timestamp }`

**`parts`** collection — `{ description, partNo, brand, category, price, createdAt }`

`price` is `number` or `null` (null means unknown / not yet quoted).

## Production Firestore rules

Test-mode rules expire after ~30 days. Before going to production, tighten them. Minimum recommended for a single-user / internal tool — restrict by Firebase Auth:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

(You'd then add Firebase Auth login to the app. For now the placeholder test rules work fine for development.)

## Source data

Initial part list comes from this sheet:
https://docs.google.com/spreadsheets/d/1kyljKo8BkgFRL5d7_jrlvEfbgb63x3zerNOMPE7dkcg

One tab per category (PLC, HMI, Breaker, Cable, Switch, etc.). Each row → one part. Only the first **Price** column is used (a second unlabeled price column in the source sheet is ignored).
