---
name: steering-files
description: Create or update project steering files for feature work, requirements clarification, or implementation planning. Use when a task needs `.steering/YYYYMMDD-task-name/requirements.md` and `design.md`, when project-specific steering conventions must be applied, or when changes may require syncing `AGENTS.md` and `docs/requirements_definition.md`.
---

# Steering Files

## Overview

Create steering files that match this project's documentation split:

- `AGENTS.md`: north star, short and stable
- `docs/requirements_definition.md`: canonical requirements and specification
- `.steering/...`: task-specific delta requirements and design

Write steering files in Japanese unless the user explicitly requests another language.

## Workflow

1. Read `AGENTS.md` and confirm the task aligns with the current product principles and constraints.
2. Read only the relevant parts of `docs/requirements_definition.md` needed for the task.
3. Create or update `.steering/YYYYMMDD-task-name/requirements.md`.
4. Create or update `.steering/YYYYMMDD-task-name/design.md`.
5. Decide whether the task changes project truth enough to require updates to `AGENTS.md` or `docs/requirements_definition.md`.
6. Keep the steering docs scoped to the current task; do not copy large chunks of the canonical spec.

## Rules

- Prefer one steering directory per task.
- Keep `requirements.md` focused on what changes now.
- Keep `design.md` focused on how the change will be implemented now.
- Do not introduce a mandatory `tasklist.md`; add it only for large multi-step work.
- Do not bloat `AGENTS.md` with task-specific detail.
- If the task changes behavior, policy, constraints, or current-state summaries, update `AGENTS.md` and `docs/requirements_definition.md` in the same turn.

## Steering Directory Naming

Use:

```text
.steering/YYYYMMDD-task-name/
```

Guidelines:

- `YYYYMMDD` uses local date at creation time
- `task-name` is short, lowercase, hyphenated, and behavior-oriented
- Prefer names like `home-weekly-progress`, `phase14-paywall-polish`, `camera-permission-fix`

## File Content Rules

### requirements.md

Include:

- 変更・追加する機能の説明
- ユーザーストーリー
- 受け入れ条件
- 制約事項

Do not include:

- 長い背景説明の丸写し
- 実装方法の詳細
- 現在タスクに関係ない将来計画

Use [references/requirements-template.md](references/requirements-template.md) as the default template.

### design.md

Include:

- 実装アプローチ
- 変更するコンポーネント
- データ構造の変更
- 影響範囲の分析

Add testing and risks when they matter to safe implementation.

Use [references/design-template.md](references/design-template.md) as the default template.

## Sync Decision

After drafting steering files, explicitly check:

1. Does this task change current product behavior?
2. Does this task change implementation policy or operating rules?
3. Does this task change canonical requirements or acceptance criteria?

If yes:

- Update `AGENTS.md` for north-star level changes
- Update `docs/requirements_definition.md` for canonical requirements/spec changes

If no:

- Leave canonical docs unchanged and keep the delta inside `.steering/...`

## Output Expectations

- Steering files should be short, concrete, and immediately usable by another agent.
- Prefer bullets and short sections over long prose.
- Keep duplication low across `AGENTS.md`, `docs/requirements_definition.md`, and `.steering/...`.
