import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computeBaseline } from "./integrity.js";
import {
  CLAUDE_AGENTS,
  CLAUDE_DIR,
  CLAUDE_SKILLS,
  DESIGN_ROOT,
  DEV_ROOT,
  INSIGHT_INBOX,
  VIBE_CHANGELOG,
  VIBE_DIR,
  VIBE_LOGS,
  VIBE_STATE,
  VIBE_SUGGESTIONS,
} from "./paths.js";
import { PRESETS_AGENTS_DIR, PRESETS_CLAUDE_MD, PRESETS_SKILLS_DIR } from "./presets.js";

const PROJECT_NAME_RE = /^[a-z0-9][a-z0-9-]{0,49}$/;

export function validateProjectName(name: string): string | null {
  if (!PROJECT_NAME_RE.test(name)) {
    return "프로젝트 이름은 소문자/숫자로 시작, 소문자·숫자·하이픈만 허용 (최대 50자).";
  }
  return null;
}

export function projectPath(name: string): string {
  return join(DEV_ROOT, name);
}

/** Ensure global roots (§10) exist so vibe new is idempotent on a fresh machine. */
function ensureGlobalRoots(): void {
  if (!existsSync(INSIGHT_INBOX)) mkdirSync(INSIGHT_INBOX, { recursive: true });
  if (!existsSync(DESIGN_ROOT)) mkdirSync(DESIGN_ROOT, { recursive: true });
}

interface ScaffoldResult {
  projectDir: string;
}

/**
 * Create the project directory tree and copy presets in.
 * Throws if the directory already exists.
 */
export function scaffoldProject(name: string): ScaffoldResult {
  const dir = projectPath(name);
  if (existsSync(dir)) {
    throw new Error(`이미 존재합니다: ${dir}`);
  }

  ensureGlobalRoots();

  // Top-level dirs
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, CLAUDE_DIR), { recursive: true });
  mkdirSync(join(dir, VIBE_DIR), { recursive: true });
  mkdirSync(join(dir, VIBE_LOGS), { recursive: true });

  // Copy CEO persona (presets/CLAUDE.md → <project>/CLAUDE.md)
  cpSync(PRESETS_CLAUDE_MD, join(dir, "CLAUDE.md"));

  // Copy team-lead subagent definitions (presets/agents/* → <project>/.claude/agents/*)
  cpSync(PRESETS_AGENTS_DIR, join(dir, CLAUDE_AGENTS), { recursive: true });

  // BLUEPRINT §13: Claude Code Skills 자동 트리거를 위한 SKILL.md 박제.
  // .claude/skills/insight/SKILL.md → ~/dev/insight 사용 가이드
  // .claude/skills/design/SKILL.md → ~/dev/design 사용 가이드
  // 자료 자체는 ~/dev/insight 와 ~/dev/design 에 그대로 두고, SKILL.md가 진입점 역할.
  cpSync(PRESETS_SKILLS_DIR, join(dir, CLAUDE_SKILLS), { recursive: true });

  // BLUEPRINT placeholder — CEO/planner will fill this during the conversation.
  writeFileSync(
    join(dir, "BLUEPRINT.md"),
    `# BLUEPRINT — ${name}\n\n> _이 문서는 기획팀장(planner)이 사용자와의 대화를 통해 채웁니다._\n`,
  );

  // .vibe/ metadata — baseline hashes power doctor's §17.3 drift check.
  const state = {
    name,
    createdAt: new Date().toISOString(),
    phase: "planning",
    baseline: computeBaseline(dir),
  };
  writeFileSync(join(dir, VIBE_STATE), JSON.stringify(state, null, 2) + "\n");
  writeFileSync(
    join(dir, VIBE_CHANGELOG),
    `# CHANGELOG\n\n_PRESET 변경 사유를 한 줄씩 기록합니다 (BLUEPRINT §17)._\n`,
  );
  writeFileSync(
    join(dir, VIBE_SUGGESTIONS),
    `# SUGGESTIONS\n\n_vibe가 떠올린 개선 아이디어가 누적됩니다. 사용자가 검토 후 BLUEPRINT에 직접 반영 (§17)._\n`,
  );

  // .gitignore
  writeFileSync(
    join(dir, ".gitignore"),
    "node_modules\ndist\n.next\n.env\n.env.local\n*.tsbuildinfo\n.DS_Store\n.vibe/logs\n",
  );

  return { projectDir: dir };
}
