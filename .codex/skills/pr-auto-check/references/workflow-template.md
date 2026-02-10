# PR Check Workflow Template

Use this as the default and replace command steps with repository-specific commands.

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

## Adaptation rules

- Keep only commands that exist in `package.json` scripts.
- Use `npx tsc --noEmit` only when TypeScript exists and no `typecheck` script is defined.
- If tests require external services, split into a separate workflow or gate with labels.
- Keep PR checks fast; move heavy e2e checks to scheduled or manual workflows if needed.
