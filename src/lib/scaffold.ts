import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computeBaseline } from "./integrity.js";
import {
  DESIGN_ROOT,
  DEV_ROOT,
  INSIGHT_INBOX,
  VIBE_CHANGELOG,
  VIBE_DIR,
  VIBE_LOGS,
  VIBE_STATE,
  VIBE_SUGGESTIONS,
} from "./paths.js";

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
 * BLUEPRINT §10 (v3 모델): 프로젝트는 vibe 시스템 prompts를 *참조*만 한다.
 * scaffold는 .claude/agents·skills·CLAUDE.md를 더 이상 cp하지 않는다.
 * baseline도 BLUEPRINT.md만 추적 (그 외 prompts는 ~/.claude/에서 옴).
 *
 * Throws if the directory already exists. (입양은 scaffoldAdopt 사용)
 */
export function scaffoldProject(name: string): ScaffoldResult {
  const dir = projectPath(name);
  if (existsSync(dir)) {
    throw new Error(`이미 존재합니다: ${dir}`);
  }

  ensureGlobalRoots();
  scaffoldMeta(dir, name);
  writeFileSync(
    join(dir, "BLUEPRINT.md"),
    `# BLUEPRINT — ${name}\n\n> _이 문서는 기획팀장(planner)이 사용자와의 대화를 통해 채웁니다._\n`,
  );
  scaffoldGitignore(dir);
  refreshBaseline(dir, name);

  return { projectDir: dir };
}

/**
 * 기존 디렉토리(vibe로 만들지 않은 일반 프로젝트)에 vibe 메타만 박제.
 * BLUEPRINT.md, .vibe/, .gitignore가 없으면 추가. 이미 있으면 보존.
 */
export interface AdoptResult {
  projectDir: string;
  added: string[];
  preserved: string[];
}

export function scaffoldAdopt(targetDir: string, name: string): AdoptResult {
  if (!existsSync(targetDir)) {
    throw new Error(`디렉토리가 없습니다: ${targetDir}`);
  }

  ensureGlobalRoots();
  const added: string[] = [];
  const preserved: string[] = [];

  // .vibe/ 메타는 항상 새로 (기존 게 있으면 vibe 프로젝트라는 뜻이라 별개 로직 필요 → 거부)
  if (existsSync(join(targetDir, VIBE_DIR))) {
    throw new Error(`이미 vibe 프로젝트입니다: ${join(targetDir, VIBE_DIR)} 존재`);
  }
  scaffoldMeta(targetDir, name);
  added.push(VIBE_DIR);

  // BLUEPRINT.md — 없으면 placeholder 추가, 있으면 보존
  const blueprintPath = join(targetDir, "BLUEPRINT.md");
  if (!existsSync(blueprintPath)) {
    writeFileSync(
      blueprintPath,
      `# BLUEPRINT — ${name}\n\n> _이 문서는 기획팀장(planner)이 사용자와의 대화를 통해 채웁니다._\n` +
        `> _기존 코드를 vibe로 입양했으니, planner가 코드 구조를 먼저 훑은 뒤 채우게 됩니다._\n`,
    );
    added.push("BLUEPRINT.md");
  } else {
    preserved.push("BLUEPRINT.md");
  }

  // .gitignore — 없으면 추가, 있으면 보존
  if (!existsSync(join(targetDir, ".gitignore"))) {
    scaffoldGitignore(targetDir);
    added.push(".gitignore");
  } else {
    preserved.push(".gitignore");
  }

  // baseline 재계산 (실제 BLUEPRINT.md 기준)
  refreshBaseline(targetDir, name);

  return { projectDir: targetDir, added, preserved };
}

function scaffoldMeta(dir: string, name: string): void {
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, VIBE_DIR), { recursive: true });
  mkdirSync(join(dir, VIBE_LOGS), { recursive: true });

  // baseline은 호출자가 BLUEPRINT.md 작성 후 refreshBaseline()으로 채운다.
  const state = {
    name,
    createdAt: new Date().toISOString(),
    phase: "planning",
    baseline: {} as Record<string, string | null>,
  };
  writeFileSync(join(dir, VIBE_STATE), JSON.stringify(state, null, 2) + "\n");
  writeFileSync(
    join(dir, VIBE_CHANGELOG),
    `# CHANGELOG\n\n_BLUEPRINT.md 변경 사유를 한 줄씩 기록합니다 (BLUEPRINT §17)._\n`,
  );
  writeFileSync(
    join(dir, VIBE_SUGGESTIONS),
    `# SUGGESTIONS\n\n_vibe가 떠올린 개선 아이디어가 누적됩니다. 사용자가 검토 후 BLUEPRINT에 직접 반영 (§17)._\n`,
  );
}

function scaffoldGitignore(dir: string): void {
  writeFileSync(
    join(dir, ".gitignore"),
    "node_modules\ndist\n.next\n.env\n.env.local\n*.tsbuildinfo\n.DS_Store\n.vibe/logs\n",
  );
}

/** BLUEPRINT.md가 채워진 후 baseline을 다시 계산 (입양 흐름에서 호출). */
export function refreshBaseline(dir: string, name: string): void {
  const stateFile = join(dir, VIBE_STATE);
  let state: Record<string, unknown>;
  try {
    state = JSON.parse(readFileSync(stateFile, "utf8"));
  } catch {
    state = {
      name,
      createdAt: new Date().toISOString(),
      phase: "planning",
    };
  }
  state.baseline = computeBaseline(dir);
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n");
}
