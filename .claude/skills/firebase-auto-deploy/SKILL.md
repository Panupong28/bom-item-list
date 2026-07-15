---
name: firebase-auto-deploy
description: >-
  Set up one-time Firebase Hosting auto-deploy for a GitHub repo using GitHub
  Actions. Use when the user wants to configure automatic deployment to Firebase
  Hosting on push to main, create the deploy workflow + service-account secret,
  wire up "deploy on merge", or replicate this pattern on a new repo. Triggers on
  requests like "set up firebase deploy", "auto deploy to firebase hosting",
  "firebase login and deploy from github", "deploy this app to firebase".
---

# Firebase Hosting auto-deploy (GitHub Actions)

Goal: configure a repo **once** so it deploys to Firebase Hosting automatically on
every push to `main`. After setup, the user just merges to `main` (or asks to
trigger it) and the live site updates. No interactive `firebase login`, no
per-session tooling.

## Why GitHub Actions (not deploy-from-container)

Claude's cloud container is **ephemeral** (wiped each session) and its **network
policy often blocks Firebase's servers**. GitHub's runners have open network and
persistent per-repo secrets, so the deploy runs there. The container only
*triggers* and *monitors* the run. Do not try to `firebase login` / `firebase
deploy` from inside the container — verify the network first if ever tempted
(`curl -s -o /dev/null -w '%{http_code}' https://firebasehosting.googleapis.com/`);
a `403` from the proxy means it's blocked.

## What Claude does vs. what the user must do

Claude can create all the **repo files** and trigger/verify the deploy. Only the
user can do the two credential steps (they touch their Firebase + GitHub account):
generating the service-account key and pasting it into GitHub secrets. Never ask
for the key contents in chat — it goes straight into GitHub secrets.

---

## Steps

### 1. Gather project facts

Determine, by reading the repo (ask the user only if it can't be inferred):

- **Firebase project ID** — check `.firebaserc` (`projects.default`), any
  `firebaseConfig` in source (`projectId`), or ask.
- **Build command & output dir** — from `package.json` scripts and the framework:
  - Vite → `npm run build`, output `dist`
  - Create React App → `npm run build`, output `build`
  - Next.js static export / other → confirm with the user
  - Plain static site → no build, output is the site dir (e.g. `public`)
- **Node version** — default to `22` unless the repo pins another.
- **Package manager** — `npm ci` if `package-lock.json` exists; adapt for
  pnpm/yarn if that's what the repo uses.

### 2. Ensure `firebase.json` and `.firebaserc`

If `firebase.json` is missing, create it (point `public` at the build output):

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

`.firebaserc` is usually gitignored (fine — the workflow passes `projectId`
explicitly). If it's needed locally, its content is:
`{ "projects": { "default": "<PROJECT_ID>" } }`.

### 3. Create `.github/workflows/deploy.yml`

Replace `<PROJECT_ID>`, and adjust the build/output steps to match step 1.

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy to Firebase Hosting (live)
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: <PROJECT_ID>
```

For a no-build static site, drop the Build step and set `public` accordingly.

### 4. (Recommended) Create `.github/workflows/ci.yml`

Runs tests + build on every push/PR so broken code is caught before `main`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test --if-present
      - run: npm run build
```

### 5. Write `DEPLOY.md`

Document the one-time setup and how to deploy afterward (see the "User steps"
section below — mirror it into `DEPLOY.md` so the user has a lasting reference,
including a "reusing on another repo" note).

### 6. Commit on a feature branch, not `main`

Commit these files on the working branch (e.g. `develop`) and open/refresh a PR
into `main`. Do **not** push straight to `main` — every push to `main` triggers a
deploy, so let the merge be the deliberate trigger. Verify `npm run build` (and
`npm test` if present) locally before committing.

### 7. Hand off the two user steps, then trigger

Tell the user to do these once (all doable from a phone browser):

1. **Create the key**: Firebase Console → the project → ⚙️ Project settings →
   **Service accounts** → **Generate new private key** → a `.json` downloads.
2. **Store it**: GitHub repo → **Settings → Secrets and variables → Actions** →
   **New repository secret** → name it exactly `FIREBASE_SERVICE_ACCOUNT` → paste
   the whole `.json`.
3. **Authorized domain** (avoids sign-in breakage): Firebase Console →
   Authentication → Settings → Authorized domains → ensure `<project>.web.app`
   is listed.

**Order matters:** the secret must exist **before** the first deploy, or the run
fails with a red ✗ (no credential). Once the user confirms the secret is added:

- Merge the PR into `main` (this puts the workflow on `main` *and* triggers the
  first deploy), or if the workflow is already on `main`, trigger it via
  `workflow_dispatch`.
- The live URL is `https://<project>.web.app`.

### 8. Verify the run

Watch the deploy workflow run via the GitHub Actions tools. Confirm the
**Deploy to Firebase Hosting** step succeeds (that proves the secret is valid).
Report the live URL. If it fails, read the job logs: a failure on the deploy step
is almost always a missing/invalid `FIREBASE_SERVICE_ACCOUNT` secret or the
service account lacking the **Firebase Hosting Admin** role.

---

## Rollback

If a deploy ships a bad version, roll back by restoring the previous good app
state and pushing to `main` (the workflow redeploys it). Firebase's console
rollback only helps if there's a prior Hosting release. Keep the deploy pipeline
files intact when reverting app code — revert only the app source, not the
workflow.

## Reusing on another repo

The pattern is per-repo. For each new repo: copy `deploy.yml` (and `ci.yml`),
set its `projectId`, ensure its `firebase.json` points at its build output, then
repeat step 7 with **that** project's own service-account key and its **own**
`FIREBASE_SERVICE_ACCOUNT` secret in that repo's GitHub settings. Each repo
carries its own workflow (committed) and its own secret (in its settings) — set
once, then automatic.
