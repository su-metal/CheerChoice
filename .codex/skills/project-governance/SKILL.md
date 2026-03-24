name: project-governance
description: Establish or realign project documentation governance for a new or existing repository. Use when a project needs AGENTS.md north-star setup, docs/requirements_definition.md as the canonical spec, docs/requirements.md redirect handling, `.steering` conventions, or installation of a local `steering-files` skill so future tasks follow the same workflow automatically.
---

# Project Governance

## Overview

Initialize a repository so project guidance is managed with this split:

- `AGENTS.md`: short north-star guide
- `docs/requirements_definition.md`: canonical requirements/specification
- `docs/requirements.md`: compatibility redirect to the canonical spec
- `.steering/YYYYMMDD-task-name/`: task-specific delta requirements and design
- `.codex/skills/steering-files/`: optional project-local steering skill for future task setup

Use this skill for both new projects and existing repositories that need their documentation operating model introduced, repaired, or standardized.

## Workflow

1. Inspect the repository for existing `AGENTS.md`, `CLAUDE.md`, `docs/`, `.steering/`, and `.codex/skills/`.
2. Identify whether the repo already has a canonical requirements/spec document that should become `docs/requirements_definition.md`.
3. Create or rewrite `AGENTS.md` as a short north-star document.
4. Create or rewrite `docs/requirements_definition.md` as the canonical specification entrypoint.
5. Create or rewrite `docs/requirements.md` as a redirect/compatibility page.
6. Ensure `AGENTS.md` tells future agents to use `docs/requirements_definition.md` and `.steering/...`.
7. If the project does not already have a local steering skill, install a project-local `steering-files` skill using the bundled templates in `references/`.
8. If the repository uses `CLAUDE.md`, align it to the same operating model unless the user explicitly wants it different.

## Rules

- Keep `AGENTS.md` short. Do not dump the full spec into it.
- Put durable principles, constraints, and operating rules in `AGENTS.md`.
- Put detailed product requirements, acceptance criteria, and long-form specification in `docs/requirements_definition.md`.
- Use `.steering/...` only for task-specific deltas.
- Write the generated project docs in Japanese unless the project clearly uses another language.
- Prefer adapting existing docs over creating parallel conflicting files.

## What To Create

### AGENTS.md

Create a north-star guide that includes:

- project purpose
- core principles
- important architecture facts
- hard constraints
- documentation rules
- working defaults

Use [references/agents-template.md](references/agents-template.md) as the default shape.

### docs/requirements_definition.md

Create a canonical requirements/specification document entrypoint that:

- states it is the canonical spec
- states it stays aligned with `AGENTS.md`
- contains or points to the project's detailed requirements

Use [references/requirements-definition-template.md](references/requirements-definition-template.md) as the default preamble.

### docs/requirements.md

Create a short compatibility redirect to `docs/requirements_definition.md`.

Use [references/requirements-redirect-template.md](references/requirements-redirect-template.md).

### .steering conventions

Ensure the project follows:

```text
.steering/YYYYMMDD-task-name/
  requirements.md
  design.md
```

Document this convention in `AGENTS.md`.

### Project-local steering skill

If `.codex/skills/steering-files/` is missing, create it from:

- [references/steering-skill-SKILL.md](references/steering-skill-SKILL.md)
- [references/steering-skill-openai.yaml](references/steering-skill-openai.yaml)
- [references/steering-requirements-template.md](references/steering-requirements-template.md)
- [references/steering-design-template.md](references/steering-design-template.md)

## Decision Rules

- If an existing requirements doc already contains the real spec, migrate or rename it to `docs/requirements_definition.md` rather than duplicating it.
- If `AGENTS.md` already exists but is too long, compress it instead of appending more sections.
- If the repo has both `AGENTS.md` and `CLAUDE.md`, keep their operating model consistent.
- If task-specific notes are currently living in `AGENTS.md`, move them into `.steering/...` when practical.

## Completion Check

Before finishing, verify:

- `AGENTS.md` is concise and north-star oriented
- `docs/requirements_definition.md` is the canonical spec entrypoint
- `docs/requirements.md` redirects to the canonical spec
- `.steering` usage is documented
- `steering-files` exists locally or the reason for skipping is explicit
- `AGENTS.md` and `docs/requirements_definition.md` do not contradict each other
