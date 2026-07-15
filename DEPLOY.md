# Deployment (Firebase Hosting via GitHub Actions)

This repo auto-deploys to **Firebase Hosting** using GitHub Actions. Once the
one-time setup below is done, you never configure anything again — every update
to `main` publishes automatically.

Live URL: **https://bom-item-list.web.app**

---

## One-time setup (per repo, ~5 minutes)

You only do this **once**. After that, deploys are automatic.

### 1. Create a Firebase service account key

1. Open the [Firebase Console](https://console.firebase.google.com) → project **bom-item-list**
2. Click ⚙️ (top-left) → **Project settings** → **Service accounts** tab
3. Click **Generate new private key** → confirm. A `.json` file downloads.

> This key lets GitHub Actions deploy on your behalf. Keep it private — never
> commit it to the repo.

### 2. Add the key as a GitHub repository secret

1. Open the repo on GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name (exactly): `FIREBASE_SERVICE_ACCOUNT`
4. Value: open the downloaded `.json`, copy **all** of it, paste it in
5. **Add secret**

### 3. Confirm the sign-in domain (one-time)

Firebase Console → **Authentication** → **Settings** → **Authorized domains** →
make sure `bom-item-list.web.app` is listed (it usually is by default). Without
this, Google sign-in is blocked on the live site.

That's it. Setup is done forever for this repo.

---

## How to deploy (after setup)

Any of these publishes the app:

- **Merge/push to `main`** — the workflow runs automatically.
- **Manual run** — GitHub repo → **Actions** → *Deploy to Firebase Hosting* →
  **Run workflow**.
- **Ask Claude in a session** — "deploy" — and it triggers the workflow for you.

Progress and logs are visible under the repo's **Actions** tab. A run takes
~2 minutes; when it's green, the live URL is updated.

---

## What runs (`.github/workflows/deploy.yml`)

On push to `main` (or manual dispatch): install deps → `npm run build` →
deploy the `dist/` output to the live Firebase Hosting channel using the
`FIREBASE_SERVICE_ACCOUNT` secret.

CI (tests + build) also runs separately on every push/PR via
`.github/workflows/ci.yml`, so broken code is caught before it reaches `main`.

---

## Reusing this on another repo

The pattern is per-repo. For a different project:

1. Copy `.github/workflows/deploy.yml` into the new repo and change `projectId`
   to that project's Firebase project ID (and adjust the build/output steps if
   its build differs).
2. Make sure the repo has a `firebase.json` pointing at its build output
   directory.
3. Repeat the **one-time setup** above for that repo: generate *its* service
   account key and add *its own* `FIREBASE_SERVICE_ACCOUNT` secret in that
   repo's GitHub settings.

Each repo carries its own workflow (committed) and its own secret (in its GitHub
settings) — set once, then automatic.
