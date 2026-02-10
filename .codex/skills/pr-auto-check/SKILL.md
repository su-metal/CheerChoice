---
name: pr-auto-check
description: Configure or update automatic pull request code checks with GitHub Actions for JavaScript/TypeScript repositories. Use when a user asks to run lint/typecheck/test/build on PR creation or update, to tighten merge quality gates, or to standardize CI checks before merge.
---

# Pr Auto Check

## Overview

Set up and maintain `.github/workflows/pr-check.yml` so PRs automatically run code checks.
Prefer repository-native commands (`npm run <script>`) and only add fallback commands when scripts do not exist.

## Workflow

1. Inspect project scripts and toolchain.
2. Decide a minimal check set for PR safety.
3. Create or update `.github/workflows/pr-check.yml`.
4. Verify commands locally when possible.
5. Report what runs on PR and what is intentionally skipped.

## Step 1: Inspect Project

- Read `package.json` scripts.
- Detect TypeScript (`tsconfig.json`) and test/lint/build scripts.
- If available, run `scripts/detect-check-commands.ps1` to propose concrete commands.

## Step 2: Decide Check Set

Default order:
1. Install dependencies (`npm ci`)
2. Type check (`npm run typecheck` or `npx tsc --noEmit` if TypeScript exists)
3. Lint (`npm run lint` when defined)
4. Test (`npm test` when defined)
5. Build (`npm run build` when defined)

Do not invent project commands. If a command is missing and no safe fallback exists, skip it and note why.

## Step 3: Generate Workflow

Create or update `.github/workflows/pr-check.yml`:

- Trigger on:
  - `pull_request` (`opened`, `synchronize`, `reopened`, `ready_for_review`)
  - `workflow_dispatch`
- Use `ubuntu-latest`.
- Pin Node major to repository expectation (or use current LTS, `20`).
- Use dependency cache (`actions/setup-node` with `cache: npm`).
- Add `concurrency` to cancel stale PR runs:
  - group: `pr-check-${{ github.event.pull_request.number || github.ref }}`
  - cancel-in-progress: `true`
- Keep jobs deterministic and fail-fast.

Use this baseline structure and replace commands with discovered ones:

```yaml
name: PR Check
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
  workflow_dispatch:

concurrency:
  group: pr-check-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## Step 4: Verify Locally

- Run only commands that exist in this repository.
- If CI adds `npx tsc --noEmit` fallback, run it locally once when possible.
- If checks are expensive or blocked, report the gap explicitly.

## Step 5: Report

- List final CI commands in execution order.
- Mention skipped checks and why.
- Point to workflow path and any required follow-up (missing scripts, flaky tests, secrets).

## Resources

### scripts/detect-check-commands.ps1
Detects safe PR-check commands based on `package.json` scripts and local files.

### references/workflow-template.md
Contains a reusable workflow template and adaptation notes.
