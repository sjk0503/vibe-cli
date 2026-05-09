import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import pc from "picocolors";
import { computeBaseline, detectDrift, type BaselineHashes, type DriftEntry } from "../lib/integrity.js";
import {
  DESIGN_ROOT,
  INSIGHT_INBOX,
  INSIGHT_ROOT,
  VIBE_CHANGELOG,
  VIBE_STATE,
} from "../lib/paths.js";
import { ask } from "../lib/prompt.js";

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
  fix?: string;
  /** When true, render as a neutral skip rather than a failure. */
  skipped?: boolean;
}

function which(cmd: string): string | null {
  try {
    return execSync(`command -v ${cmd}`, { encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export async function runDoctor(): Promise<number> {
  const checks: Check[] = [];

  // 1. Claude Code CLI — BLUEPRINT §4 hard requirement
  const claudePath = which("claude");
  checks.push({
    name: "claude CLI installed",
    ok: claudePath !== null,
    detail: claudePath ?? "not found in PATH",
    fix: "Install Claude Code: https://docs.claude.com/claude-code",
  });

  // 2. Node >= 20
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push({
    name: "Node.js >= 20",
    ok: nodeMajor >= 20,
    detail: `v${process.versions.node}`,
    fix: "Upgrade Node.js to v20 or newer",
  });

  // 3. git CLI — used by vibe for commit/push
  const gitPath = which("git");
  checks.push({
    name: "git installed",
    ok: gitPath !== null,
    detail: gitPath ?? "not found",
    fix: "Install git",
  });

  // 4. ~/dev/insight directory tree (§13)
  checks.push({
    name: "~/dev/insight exists",
    ok: isDir(INSIGHT_ROOT),
    detail: INSIGHT_ROOT,
    fix: `mkdir -p ${INSIGHT_INBOX}`,
  });

  checks.push({
    name: "~/dev/insight/inbox exists",
    ok: isDir(INSIGHT_INBOX),
    detail: INSIGHT_INBOX,
    fix: `mkdir -p ${INSIGHT_INBOX}`,
  });

  // 5. ~/dev/design (§10)
  checks.push({
    name: "~/dev/design exists",
    ok: isDir(DESIGN_ROOT),
    detail: DESIGN_ROOT,
    fix: `mkdir -p ${DESIGN_ROOT}`,
  });

  // 6. BLUEPRINT health check stub (§17.3)
  // Only meaningful when cwd is a vibe project (has .vibe/ or BLUEPRINT.md).
  // Full health-check (CHANGELOG drift, CORE diff, etc.) lands in a later milestone.
  const inVibeProject = isDir(".vibe") || existsSync("BLUEPRINT.md");
  if (inVibeProject) {
    const blueprintInCwd = existsSync("BLUEPRINT.md");
    checks.push({
      name: "BLUEPRINT.md present",
      ok: blueprintInCwd,
      detail: blueprintInCwd ? "found" : "missing — every vibe project needs one",
    });
  } else {
    checks.push({
      name: "BLUEPRINT.md present",
      ok: true,
      skipped: true,
      detail: "skipped (not inside a vibe project)",
    });
  }

  // Render
  console.log(pc.bold("\nvibe doctor\n"));
  let failed = 0;
  for (const c of checks) {
    const mark = c.skipped ? pc.dim("·") : c.ok ? pc.green("✓") : pc.red("✗");
    const detail = c.detail ? pc.dim(` — ${c.detail}`) : "";
    console.log(`  ${mark} ${c.name}${detail}`);
    if (!c.ok && !c.skipped) {
      failed++;
      if (c.fix) console.log(`      ${pc.yellow("→")} ${c.fix}`);
    }
  }

  // §17.3 지침 헬스체크 — vibe 프로젝트 안에서만
  if (inVibeProject) {
    renderInstructionDrift(process.cwd());
  }

  console.log();
  if (failed === 0) {
    console.log(pc.green("All checks passed."));
    return 0;
  }
  console.log(pc.red(`${failed} check(s) failed.`));
  return 1;
}

function renderInstructionDrift(cwd: string): void {
  const stateFile = join(cwd, VIBE_STATE);
  if (!existsSync(stateFile)) return;

  let baseline: BaselineHashes | undefined;
  try {
    const raw = JSON.parse(readFileSync(stateFile, "utf8"));
    baseline = raw.baseline;
  } catch {
    return;
  }
  if (!baseline) return;

  const drift = detectDrift(cwd, baseline);
  console.log();
  console.log(pc.bold("지침 헬스체크 (§17.3)"));
  if (drift.length === 0) {
    console.log(`  ${pc.green("✓")} baseline과 동일`);
    return;
  }

  const core: DriftEntry[] = [];
  const preset: DriftEntry[] = [];
  for (const d of drift) {
    if (d.path === "BLUEPRINT.md") core.push(d);
    else preset.push(d);
  }

  if (core.length > 0) {
    console.log(`  ${pc.yellow("·")} CORE 변경:`);
    for (const d of core) {
      console.log(`      ${pc.dim("-")} ${d.path} ${pc.dim(`(${d.kind})`)}`);
    }
    console.log(pc.dim("      └ §17.1: CORE는 사용자 직접 편집만 허용. 변경 의도가 맞는지 확인하세요."));
  }

  if (preset.length > 0) {
    console.log(`  ${pc.yellow("·")} PRESET 변경:`);
    for (const d of preset) {
      console.log(`      ${pc.dim("-")} ${d.path} ${pc.dim(`(${d.kind})`)}`);
    }
    console.log(pc.dim("      └ §17.2: 변경 사유를 .vibe/CHANGELOG.md에 한 줄 기록 권장."));
  }

  console.log(pc.dim("      변경을 인정하고 사유를 기록하려면: vibe doctor accept"));
}

/**
 * BLUEPRINT §17 안전장치 #2: PRESET 변경 시 CHANGELOG에 사유 한 줄 기록 강제.
 * 이 명령어가 그 강제 시점.
 */
export async function runDoctorAccept(): Promise<number> {
  const cwd = process.cwd();
  const stateFile = join(cwd, VIBE_STATE);
  if (!existsSync(stateFile)) {
    console.error(pc.red("vibe 프로젝트가 아닙니다 (.vibe/state.json 없음)."));
    return 1;
  }

  let state: { baseline?: BaselineHashes; [k: string]: unknown };
  try {
    state = JSON.parse(readFileSync(stateFile, "utf8"));
  } catch (e) {
    console.error(pc.red(`state.json 파싱 실패: ${(e as Error).message}`));
    return 1;
  }

  if (!state.baseline) {
    console.error(pc.red("state.json에 baseline이 없습니다 (구버전 프로젝트일 수 있음)."));
    return 1;
  }

  const drift = detectDrift(cwd, state.baseline);
  if (drift.length === 0) {
    console.log(pc.dim("변경된 지침 파일이 없습니다."));
    return 0;
  }

  console.log(pc.bold("\n변경된 지침 파일:"));
  for (const d of drift) {
    console.log(`  ${pc.yellow("·")} ${d.path} ${pc.dim(`(${d.kind})`)}`);
  }

  const reason = await ask("\n변경 사유 (한 줄, 빈 입력 거부): ");
  if (!reason || reason.trim().length === 0) {
    console.error(pc.red("사유는 필수입니다 (§17 안전장치 #2)."));
    return 1;
  }

  const changelogPath = join(cwd, VIBE_CHANGELOG);
  const date = new Date().toISOString().slice(0, 10);
  const filesStr = drift.map((d) => `${d.path} (${d.kind})`).join(", ");
  const entry = `\n- ${date}: ${reason.trim()}\n  └ ${filesStr}\n`;
  appendFileSync(changelogPath, entry);

  state.baseline = computeBaseline(cwd);
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n");

  console.log(pc.green(`\n✓ ${VIBE_CHANGELOG} 기록 + baseline 갱신 완료.`));
  return 0;
}
