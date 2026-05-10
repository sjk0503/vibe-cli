import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { PRESETS_AGENTS_DIR, PRESETS_SKILLS_DIR } from "./presets.js";

/**
 * BLUEPRINT §10/§13 (v3 모델): vibe presets는 ~/.claude/에 시스템으로 설치되어
 * 모든 프로젝트가 참조한다. vibe doctor update 후 또는 새 명령 첫 호출 시 자동.
 *
 * 사용자 ~/.claude/CLAUDE.md (글로벌 instructions)는 절대 안 건드린다.
 * vibe가 관리하는 5개 agents 파일과 2개 skill 디렉토리만 박제.
 */

const SYSTEM_CLAUDE_DIR = join(homedir(), ".claude");
const SYSTEM_AGENTS_DIR = join(SYSTEM_CLAUDE_DIR, "agents");
const SYSTEM_SKILLS_DIR = join(SYSTEM_CLAUDE_DIR, "skills");

/** vibe가 관리하는 agent 파일명 — 이 파일들만 동기화 대상. 다른 사용자 agent는 무관. */
const VIBE_AGENT_FILES = ["planner.md", "designer.md", "frontend.md", "backend.md", "qa.md"];

/** vibe가 관리하는 skill 디렉토리명 — 이 디렉토리들만 동기화. */
const VIBE_SKILL_DIRS = ["insight", "design"];

export interface SystemInstallResult {
  agentsCopied: string[];
  skillsCopied: string[];
}

/**
 * 멱등 동기화: presets/agents/* → ~/.claude/agents/*, presets/skills/* → ~/.claude/skills/*.
 * vibe 본체에 추가/삭제된 agent·skill만 갱신. 사용자가 추가한 별도 파일은 보존.
 */
export function installSystemPresets(): SystemInstallResult {
  mkdirSync(SYSTEM_AGENTS_DIR, { recursive: true });
  mkdirSync(SYSTEM_SKILLS_DIR, { recursive: true });

  const agentsCopied: string[] = [];
  const skillsCopied: string[] = [];

  // Agents
  const presetAgents = readdirSync(PRESETS_AGENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name);

  for (const filename of presetAgents) {
    if (!VIBE_AGENT_FILES.includes(filename)) continue;
    const src = join(PRESETS_AGENTS_DIR, filename);
    const dst = join(SYSTEM_AGENTS_DIR, filename);
    cpSync(src, dst);
    agentsCopied.push(dst);
  }

  // Skills
  const presetSkills = readdirSync(PRESETS_SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const dirname of presetSkills) {
    if (!VIBE_SKILL_DIRS.includes(dirname)) continue;
    const src = join(PRESETS_SKILLS_DIR, dirname);
    const dst = join(SYSTEM_SKILLS_DIR, dirname);
    cpSync(src, dst, { recursive: true });
    skillsCopied.push(dst);
  }

  return { agentsCopied, skillsCopied };
}
