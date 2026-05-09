# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repo currently contains only `BLUEPRINT.md` — the full spec for `vibe`, a personal CLI that orchestrates Claude Code as a subprocess to run an opinionated indie-builder workflow ("idea → plan → design → build → ship" inside one terminal). **No source, `package.json`, or git repo exists yet.** Treat `BLUEPRINT.md` as the constitution and base every implementation decision on it.

## Hard invariants — do not violate

These are load-bearing rules from the BLUEPRINT. Breaking any of them defeats the project's reason for existing.

- **BLUEPRINT is read-only to agents** (§0). Never auto-edit it. Only edit it when the user explicitly says "BLUEPRINT 업데이트해줘"; otherwise route improvement ideas to `.vibe/SUGGESTIONS.md`.
- **No Claude Code SDK calls** (§4). Anthropic restricted third-party use of Claude Code SDK OAuth tokens in April 2026. `vibe` must shell out to the user's already-installed Claude Code CLI via `child_process.spawn`, never link the SDK. Authentication is the user's own Claude Code's responsibility. This is what keeps `vibe` ToS-compliant.
- **Always pass `--dangerously-skip-permissions`** when spawning Claude Code (§12-1). "Never click a permission button" is a success metric (§19).
- **Exactly five commands, forever** (§6): `vibe new`, `vibe resume`, `vibe ship`, `vibe insight`, `vibe doctor`. New capabilities must be absorbed as sub-options of an existing command — do not add a sixth top-level command.
- **Paths are fixed** (§10). Do not introduce env vars or config files to override `~/dev/<project>`, `~/dev/insight`, `~/dev/design`, or any `.vibe/` / `.claude/` subpath.
- **CEO is the only agent that talks to the user** (§7). Team-leads (subagents in `.claude/agents/`) never address the user directly.
- **Confirm gates are non-negotiable** (§9). Auto-allowed: file ops, package installs, build/test, develop-branch commits, refactors. Always ask: design sign-off, env vars / API keys, external-service signup or project creation, domain choice, `main` merge, any git push, deploy, edits to BLUEPRINT or any CORE item.

## Architecture (at the level you'd miss by reading single files)

- **Wrapper, not framework**: `vibe` itself is a thin TS/Node CLI (commander or oclif TBD, §12-1) that drives a normal Claude Code session. The "intelligence" lives in subagent prompts under `.claude/agents/`, not in `vibe`'s code.
- **Agent topology** (§7): CEO (the main Claude Code session) dispatches to five team-leads — 기획 / 디자인 / 프론트 / 백엔드 / QA. v1 has no sub-subagents (§18). Parallelism rule: different domains run in parallel, same domain runs serially, QA is always last (§7).
- **Standard workflow** (§8): `vibe new` → 기획팀장 fills BLUEPRINT template (confirm) → 디자인팀장 ships a *running* artifact for sign-off (confirm) → 프론트 + 백엔드 in parallel → QA → `vibe ship` checklist → deploy. Design review never uses generated mockup images; only running output (dev server / Storybook / Flutter simulator / console) (§14).
- **Insight system** (§13): user dumps notes into `~/dev/insight/inbox/` with no foldering. `vibe insight organize` (or auto-trigger from `vibe new` / `vibe doctor`) classifies them into folders `vibe` invents itself. On project creation, `~/dev/insight` is **symlinked into the new project's `.claude/skills/`**, so Claude Code's Skills feature picks it up automatically.
- **State & resume** (§10): `vibe resume` reads `.vibe/state.json`. Logs at `.vibe/logs/`. Failure escalation: 3 same-error retries → ask user; per-agent step/token caps prevent runaway loops (§15).
- **Generated-project PRESETs** (§12-2) — defaults `vibe` writes into *new projects*, not dependencies of `vibe` itself:
  - Web: Next.js 15 (App Router) + TS, Tailwind v4 + shadcn/ui, Supabase, TossPayments/Stripe, Vercel, PostHog, Resend
  - Mobile: Flutter + Riverpod, Supabase, RevenueCat, PostHog, FCM, Codemagic/Fastlane
  - Game/other: no preset; CEO proposes a stack, user approves, it joins PRESET

## Three-tier instruction policy (§17) — Theseus's-ship prevention

When changing instructions or generated configs, classify the target first:

| Tier | What | Mutation rule |
|------|------|---------------|
| **CORE** | `BLUEPRINT.md`, philosophy, the 5 commands, CEO/team-lead structure, confirm policy, directory layout | **Never auto-edit.** User edits by hand only. |
| **PRESET** | Default tech stacks, common workflows, agent prompts | Propose change → user confirms → apply → record one-line reason in `.vibe/CHANGELOG.md`. |
| **LEARNED** | `insight/` contents, project notes, pitfalls | Free to accumulate. |

`.vibe/SUGGESTIONS.md` is the buffer where vibe parks its own improvement ideas for the user to fold into BLUEPRINT manually. §19 explicitly says "BLUEPRINT essentially identical after 6 months" is a success metric — resist the urge to silently rewrite CORE.

## Git workflow (§11)

- Two branches: `main` (deploy) and `develop` (work).
- vibe auto-commits to `develop` using **Conventional Commits**.
- `main` merge and any push require explicit user confirmation (§9). `main` push = production deploy (Vercel auto-trigger).
- `vibe ship` prints the §16 monetization checklist (payments wired, analytics installed, landing page, SEO meta, ToS/privacy for KR, prod env vars). Items are advisory — never hard-block.

## Build / test / lint

None defined yet — no `package.json`, no toolchain. Set these up as part of the first implementation PR rather than inferring commands.
