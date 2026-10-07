# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`vibe` is a personal CLI that wraps Claude Code to run an opinionated indie-builder workflow ("idea → plan → design → build → ship" inside one terminal). It is a thin TypeScript/Node wrapper (about 2,250 lines, runtime deps: `commander`, `picocolors`). The "intelligence" lives in the prompts under `presets/`, not in the CLI code.

`BLUEPRINT.md` is the project constitution — base every design decision on it. The five commands are implemented and working (v0.1.0).

## Build / run / test

- `npm install` — also builds `dist/` (the `prepare` script runs `tsc`).
- `npm run build` — `tsc` → `dist/`. `dist/cli.js` is the `vibe` bin (`npm link` exposes it).
- `npm run dev -- <args>` — run from source with `tsx src/cli.ts` (e.g. `npm run dev -- doctor`).
- `npm run typecheck` — `tsc --noEmit`.
- **No tests, no linter, no formatter are configured.** Verify a change by typechecking and running the command it touches.
- Node ≥ 20, ESM (`"type": "module"`, `NodeNext`, `strict` + `noUncheckedIndexedAccess`). Relative imports in `src/` must end in `.js`.

**Sandboxing.** Every path in `src/lib/paths.ts` derives from `os.homedir()`, and `vibe new` / `vibe doctor` write into `~/.claude/` (prompt sync) and `~/dev/`. To try a command without touching the real ones, use a throwaway home: `HOME=$(mktemp -d) node dist/cli.js doctor`.

## Commands (exactly five, forever)

| Command | Sub-commands / options |
|---|---|
| `vibe new [name]` | `--adopt` (adopt an existing directory instead of creating one) |
| `vibe resume [name]` | `-c/--continue`, `--resume [id]` (pass-through to `claude`) |
| `vibe ship` | `legal`, `seo` |
| `vibe insight` | `organize` |
| `vibe doctor` | `accept`, `update` |

## Hard invariants — do not violate

These are load-bearing rules from the BLUEPRINT. Breaking any of them defeats the project's reason for existing.

- **BLUEPRINT is read-only to agents** (§0). Never auto-edit it. Only edit it when the user explicitly says "BLUEPRINT 업데이트해줘"; otherwise route improvement ideas to `.vibe/SUGGESTIONS.md`. The code backs this up: `src/lib/integrity.ts` stores a sha256 of `BLUEPRINT.md` in `.vibe/state.json`, `vibe doctor` reports drift, and `vibe doctor accept` refuses an empty reason and appends it to `.vibe/CHANGELOG.md`.
- **No Claude Code SDK calls** (§4). Anthropic restricted third-party use of Claude Code SDK OAuth tokens in April 2026. `vibe` must shell out to the user's already-installed Claude Code CLI via `child_process.spawn`, never link the SDK. Authentication is the user's own Claude Code's responsibility. This is what keeps `vibe` ToS-compliant. Every launch goes through `src/lib/spawn-claude.ts`.
- **Always pass `--dangerously-skip-permissions`** when spawning Claude Code (§12-1). Both `spawnClaude` (interactive) and `promptClaude` (`claude --print`) do, and there is no opt-out. "Never click a permission button" is a success metric (§19).
- **Exactly five top-level commands** (§6). New capabilities must be absorbed as sub-options of an existing command — do not add a sixth.
- **Paths are fixed** (§10). Do not introduce env vars or config files to override `~/dev/<project>`, `~/dev/insight`, `~/dev/design`, or any `.vibe/` / `.claude/` subpath. (Overriding the OS-level `HOME` for sandboxing is fine; vibe itself adds no knob.)
- **CEO is the only agent that talks to the user** (§7). Team-leads never address the user directly. This is enforced by prompt (`presets/CLAUDE.md`, `presets/agents/*.md`), not by code.
- **Confirm gates are non-negotiable** (§9). Auto-allowed: file ops, package installs, build/test, develop-branch commits, refactors. Always ask: design sign-off, env vars / API keys, external-service signup or project creation, domain choice, `main` merge, any git push, deploy, edits to BLUEPRINT or any CORE item. These gates also live in the CEO prompt; the CLI itself never merges, pushes or deploys a user project — `vibe ship` only prints the `git checkout main && git merge develop && git push` line for the user to run.

## Architecture (what you'd miss by reading single files)

- **Wrapper, not framework.** `src/cli.ts` wires the five commands with `commander`; each lives in `src/commands/<name>.ts` and the shared logic in `src/lib/`. The interactive session is `claude` with inherited stdio, started with `--append-system-prompt <contents of presets/CLAUDE.md>` (the CEO persona). The user's own `~/.claude/CLAUDE.md` is never touched.
- **Agent topology** (§7). CEO (the main Claude Code session) dispatches to five team-leads — 기획 (planner) / 디자인 (designer) / 프론트 (frontend) / 백엔드 (backend) / QA (qa). v1 has no sub-subagents (§18). Parallelism rule: different domains run in parallel, same domain runs serially, QA is always last.
- **Presets are system-level (v3 model).** `vibe new`, `vibe doctor` and `vibe doctor update` idempotently copy `presets/agents/*.md` and `presets/skills/{insight,design}/` into `~/.claude/agents|skills/` (`src/lib/system-install.ts`, whitelisted files only — the user's other agents and skills are left alone). Projects hold no copies: `scaffold.ts` no longer creates a project `.claude/agents|skills|CLAUDE.md`, and a project's `.claude/` exists only for explicit overrides. Editing a prompt in `presets/` therefore reaches every project at the next sync, with no migration.
- **Standard workflow** (§8). `vibe new` → 기획팀장 fills the BLUEPRINT template (confirm) → 디자인팀장 ships a *running* artifact for sign-off (confirm) → 프론트 + 백엔드 in parallel → QA → `vibe ship` checklist → deploy. Design review never uses generated mockup images; only running output (dev server / Storybook / Flutter simulator / console) (§14).
- **Insight / design** (§13). The user dumps notes into `~/dev/insight/inbox/` with no foldering. `vibe insight organize` — also run automatically by `vibe new` and `vibe doctor` when the inbox is non-empty — has `claude --print` (budget-capped with `--max-budget-usd`) sort them into folders it invents. The system skills `insight` and `design` tell the CEO when to read `~/dev/insight` and `~/dev/design`. Nothing is symlinked into projects any more.
- **State & resume** (§10). Per project: `.vibe/state.json` (`name`, `createdAt`, `phase`, `baseline`), `.vibe/CHANGELOG.md`, `.vibe/SUGGESTIONS.md`, `.vibe/logs/`. `vibe resume` with no flag starts a fresh session and the CEO rebuilds context from `state.json` and `git log`; `-c` / `--resume` continue a Claude conversation. When the session exits, `spawn-claude.ts` finds the new session UUID and prints a `vibe resume <name> --resume <uuid>` hint. Failure escalation (3 same-error retries → ask the user) lives in the CEO prompt (§15).
- **Generated-project PRESETs** (§12-2) — defaults for *new projects*, not dependencies of `vibe` itself. The CEO asks for project scale first (`local-prototype` / `personal` / `service`) and applies presets accordingly.
  - Web: Next.js 15 (App Router) + TS, Tailwind v4 + shadcn/ui, Supabase, TossPayments/Stripe, Vercel, PostHog, Resend
  - Mobile: Flutter + Riverpod, Supabase, RevenueCat, PostHog, FCM, Codemagic/Fastlane
  - Game/other: no preset; CEO proposes a stack, user approves, it joins PRESET
- **`vibe ship`** (§16) prints the monetization checklist (landing page, SEO meta, payments, analytics, ToS/privacy for KR, prod env vars) as `✓` / `?` / `✗`. Items are advisory — never hard-block. `ship legal` fills static templates (no AI, to avoid hallucinated legal text) and `ship seo` generates `sitemap` / `robots` for the Next.js App Router.

### Code map

| Path | Role |
|---|---|
| `src/cli.ts`, `src/commands/*.ts` | command wiring; one file per command |
| `src/lib/spawn-claude.ts` | the only place that launches `claude`: `spawnClaude` (interactive CEO session) and `promptClaude` (one-shot `--print`) |
| `src/lib/system-install.ts`, `presets.ts` | sync of `presets/` into `~/.claude/`; location of the bundled `presets/` |
| `src/lib/paths.ts` | single source of the fixed paths |
| `src/lib/scaffold.ts`, `git.ts` | project scaffolding (`BLUEPRINT.md` placeholder, `.vibe/`, `.gitignore`); `git init -b main` → first commit → `develop` |
| `src/lib/integrity.ts` | sha256 baseline + drift detection (`BLUEPRINT.md` only) |
| `src/lib/ship-check.ts`, `legal.ts`, `seo.ts` | `vibe ship` checks, legal pages, SEO generation |
| `src/lib/insight.ts` | inbox auto-classification |
| `src/lib/self-update.ts` | `vibe doctor update` |
| `src/lib/claude-session.ts`, `projects.ts`, `prompt.ts`, `log.ts` | resume-hint session lookup, project listing, readline helper, `.vibe/logs` writer |
| `presets/` | shipped prompts: `CLAUDE.md` (CEO persona), `agents/` (5 team-leads), `skills/{insight,design}/SKILL.md`, `legal-templates/`, `seo-templates/` |

## Three-tier instruction policy (§17) — Theseus's-ship prevention

When changing instructions or generated configs, classify the target first:

| Tier | What | Mutation rule |
|------|------|---------------|
| **CORE** | `BLUEPRINT.md`, philosophy, the 5 commands, CEO/team-lead structure, confirm policy, directory layout | **Never auto-edit.** User edits by hand only. |
| **PRESET** | Default tech stacks, common workflows, agent prompts (`presets/`) | Propose change → user confirms → apply → record one-line reason in `.vibe/CHANGELOG.md`. |
| **LEARNED** | `insight/` contents, project notes, pitfalls | Free to accumulate. |

In code, only the CORE side is watched: the baseline holds `BLUEPRINT.md` only, and `vibe doctor` buckets a changed path as CORE (`BLUEPRINT.md`) or PRESET (anything else). LEARNED is deliberately untracked.

`.vibe/SUGGESTIONS.md` is the buffer where vibe parks its own improvement ideas for the user to fold into BLUEPRINT manually. §19 explicitly says "BLUEPRINT essentially identical after 6 months" is a success metric — resist the urge to silently rewrite CORE.

## Git workflow (§11)

- Two branches: `main` (deploy) and `develop` (work). `vibe new` runs `git init -b main`, commits `chore: vibe new <name>`, then branches `develop`.
- Auto-committing to `develop` with **Conventional Commits** is the CEO's job (prompt-level); the CLI only sets up the branches.
- `main` merge and any push require explicit user confirmation (§9). `main` push = production deploy (Vercel auto-trigger).
- **This repo follows the same model.** Work on `develop` and merge it into `main` (`merge: develop → main (...)`) to release: `vibe doctor update` fast-forwards a user's checkout from `origin/main` (`git pull origin main --ff-only` + `npm install`) and only runs while that checkout is on `main`.
