# Android Dependency and Gradle Maintenance Plan

## Purpose
Keep Expo/React Native Android builds stable across SDK, Gradle, and Kotlin updates and reduce deprecation risk before it becomes a blocker.

## Cadence
- Weekly (every Friday): fast dependency health check.
- Monthly (second Saturday): full Android warning audit and cleanup.
- Quarterly (first weekend of Jan/Apr/Jul/Oct): controlled upgrade cycle.

## Task Owner
- Primary owner: Frontend maintainer.
- Backup owner: Release maintainer.

## Weekly Task (10-15 min)
Run from `frontend` directory:

```bash
npm run deps:doctor
npm run deps:outdated
```

Action rules:
- If `deps:doctor` fails, create a maintenance ticket and attach output.
- If `deps:outdated` shows minor or patch upgrades, batch them into monthly task.

## Monthly Task (45-90 min)
Run from `frontend` directory:

```bash
npm run maintenance:android
```

This runs:
- `expo-doctor`
- `npm outdated`
- Gradle build with `--warning-mode all` to surface deprecations

Monthly outcomes:
- Update safe patch/minor dependencies.
- Record top deprecations coming from project code (not only `node_modules`).
- Confirm release build still succeeds after updates.

## Quarterly Upgrade Task (2-4 hours)
1. Create a branch named `chore/android-maintenance-YYYY-QN`.
2. Upgrade Expo SDK and React Native dependencies following Expo upgrade guidance.
3. Re-run:

```bash
npm install
npm run maintenance:android
```

4. Validate app login flows and parcel critical paths on Android.
5. Merge only after release build is successful.

## Prioritization Rules for Warnings
- P0: Build failure, lintVital failure, or security warning.
- P1: Deprecations from app-owned Android/Kotlin files.
- P2: Deprecations from third-party packages with active upstream fixes.
- P3: Noise-only warnings in third-party packages with no immediate impact.

## Tracking Template (copy per month)
- Month:
- Owner:
- `expo-doctor` status: pass/fail
- `npm outdated` summary:
- Gradle deprecations in app code:
- Dependencies upgraded:
- Release build status:
- Follow-up tickets:

## Immediate Next Run
- Week check: 2026-04-17
- Monthly audit: 2026-05-09
- Quarterly upgrade window: 2026-Q3 (first weekend of July)
