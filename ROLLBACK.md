# Versions & Rollback

This project keeps the last known-good version tagged so you can roll back
quickly if a new develop version turns out to be broken.

## Version history

| Version          | Git tag  | Status  | Notes                                    |
| ---------------- | -------- | ------- | ---------------------------------------- |
| `0.2.0-develop`  | —        | develop | Current in-progress version              |
| `0.1.0`          | `v0.1.0` | stable  | Last known-good release — rollback point |

The stable version is preserved as the annotated git tag **`v0.1.0`** and is
**not** deleted when develop work continues. It stays available as a rollback
target for as long as the tag exists.

## Roll back if `0.2.0-develop` is broken

### Option A — inspect the stable version (non-destructive)

```bash
git checkout v0.1.0
```

This puts you on the stable code in a detached-HEAD state to test or build it.
Return to develop with `git checkout claude/develop-version-rollback-i6noj5`.

### Option B — reset the develop branch back to stable (destructive)

```bash
git checkout claude/develop-version-rollback-i6noj5
git reset --hard v0.1.0
git push --force-with-lease origin claude/develop-version-rollback-i6noj5
```

Discards develop commits made after the stable tag. Use only when the develop
version is beyond repair and you want the branch back at the known-good state.

### Redeploy the stable version to Firebase Hosting

```bash
git checkout v0.1.0
npm ci
npm run deploy
```

Firebase Hosting also keeps its own release history — you can roll back a live
deploy from the Firebase console (Hosting → Release history → Rollback) without
touching git.

## Cutting the next stable version

When `0.2.0-develop` has been verified as good, promote it:

```bash
# bump package.json "version" to "0.2.0", commit, then:
git tag -a v0.2.0 -m "Stable release v0.2.0"
git push origin v0.2.0
```

Then start the following develop version (e.g. `0.3.0-develop`), keeping
`v0.2.0` as the new rollback point.
