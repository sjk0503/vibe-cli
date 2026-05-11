import { join } from "node:path";
import pc from "picocolors";
import { VIBE_LOGS } from "../lib/paths.js";
import { ask } from "../lib/prompt.js";
import { listVibeProjects, type VibeProject } from "../lib/projects.js";
import { spawnClaude } from "../lib/spawn-claude.js";

export interface ResumeOptions {
  /** claude --continue 패스스루: cwd의 가장 최근 대화 세션 자동 이어감. */
  continue?: boolean;
  /** claude --resume [id] 패스스루: 특정 세션 ID. true면 ID 생략(picker). */
  resumeId?: string | true;
}

export async function runResume(nameArg?: string, opts: ResumeOptions = {}): Promise<number> {
  const projects = listVibeProjects();
  if (projects.length === 0) {
    console.log(pc.dim("재개할 vibe 프로젝트가 없습니다 (~/dev/<name>/.vibe/state.json 가 있어야 함)."));
    return 1;
  }

  const target = await pickProject(projects, nameArg);
  if (!target) return 1;

  // claude 본체 세션 이어가기 (--continue / --resume) 패스스루.
  // 둘 다 주면 --continue 우선.
  const extraArgs: string[] = [];
  if (opts.continue) {
    extraArgs.push("--continue");
  } else if (opts.resumeId !== undefined) {
    extraArgs.push("--resume");
    if (typeof opts.resumeId === "string") extraArgs.push(opts.resumeId);
  }

  const tag = extraArgs.length ? pc.dim(`  [${extraArgs.join(" ")}]`) : "";
  console.log(pc.dim(`\n  → ${target.dir}${tag}\n`));
  // CEO 세션이 cwd의 CLAUDE.md / state.json / git log를 읽고 어디서 이어갈지 결정.
  return spawnClaude({
    cwd: target.dir,
    logDir: join(target.dir, VIBE_LOGS),
    extraArgs,
    resumeHintProjectName: target.name,
  });
}

async function pickProject(
  projects: VibeProject[],
  nameArg?: string,
): Promise<VibeProject | null> {
  if (nameArg) {
    const found = projects.find((p) => p.name === nameArg);
    if (!found) {
      console.error(pc.red(`프로젝트 없음: ${nameArg}`));
      return null;
    }
    return found;
  }

  if (projects.length === 1) {
    return projects[0]!;
  }

  console.log(pc.bold("\n재개할 프로젝트:\n"));
  projects.forEach((p, i) => {
    const phase = p.phase ? pc.dim(` [${p.phase}]`) : "";
    console.log(`  ${i + 1}. ${p.name}${phase}`);
  });

  const answer = await ask("\n번호 또는 이름: ");
  if (!answer) return null;

  const idx = Number(answer);
  if (Number.isInteger(idx) && idx >= 1 && idx <= projects.length) {
    return projects[idx - 1] ?? null;
  }
  const byName = projects.find((p) => p.name === answer);
  if (byName) return byName;

  console.error(pc.red("선택을 인식하지 못했습니다."));
  return null;
}
