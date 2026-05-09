import { existsSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { initGitRepo } from "../lib/git.js";
import { autoOrganizeIfAny } from "../lib/insight.js";
import { ask } from "../lib/prompt.js";
import { VIBE_LOGS } from "../lib/paths.js";
import { projectPath, scaffoldProject, validateProjectName } from "../lib/scaffold.js";
import { spawnClaude } from "../lib/spawn-claude.js";

export async function runNew(nameArg?: string): Promise<number> {
  const name = await resolveName(nameArg);
  if (name === null) return 1;

  // BLUEPRINT §13: vibe new 시작 시 inbox 자동 분류 (있으면).
  // 새 프로젝트 컨텍스트에서 CEO가 정리된 카테고리를 곧장 활용 가능.
  await autoOrganizeIfAny("vibe new");

  const dir = projectPath(name);
  console.log(pc.dim(`\n  → ${dir}`));

  try {
    scaffoldProject(name);
  } catch (e) {
    console.error(pc.red(`scaffold 실패: ${(e as Error).message}`));
    return 1;
  }

  try {
    initGitRepo(dir, name);
  } catch (e) {
    console.error(pc.red(`git 초기화 실패: ${(e as Error).message}`));
    return 1;
  }

  console.log();
  console.log(pc.green("프로젝트 생성 완료."));
  console.log(pc.dim("이제 Claude Code (CEO)를 띄웁니다. 만들고 싶은 걸 말씀해주세요.\n"));

  // CEO 세션 시동. cwd가 새 프로젝트라서 CLAUDE.md 페르소나가 자동 주입됨.
  const exit = await spawnClaude({ cwd: dir, logDir: join(dir, VIBE_LOGS) });
  return exit;
}

async function resolveName(nameArg?: string): Promise<string | null> {
  let name = nameArg?.trim() ?? "";

  if (!name) {
    const answer = await ask("프로젝트 이름 (소문자/숫자/하이픈): ");
    if (!answer) {
      console.error(pc.red("이름이 필요합니다."));
      return null;
    }
    name = answer;
  }

  const err = validateProjectName(name);
  if (err) {
    console.error(pc.red(err));
    return null;
  }

  if (existsSync(projectPath(name))) {
    console.error(pc.red(`이미 존재합니다: ${projectPath(name)}`));
    return null;
  }

  return name;
}
