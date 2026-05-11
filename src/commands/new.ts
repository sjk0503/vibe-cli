import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import pc from "picocolors";
import { initGitRepo } from "../lib/git.js";
import { autoOrganizeIfAny } from "../lib/insight.js";
import { ask } from "../lib/prompt.js";
import { DEV_ROOT, VIBE_LOGS } from "../lib/paths.js";
import { projectPath, scaffoldAdopt, scaffoldProject, validateProjectName } from "../lib/scaffold.js";
import { spawnClaude } from "../lib/spawn-claude.js";
import { installSystemPresets } from "../lib/system-install.js";
import { execFileSync } from "node:child_process";

export interface NewOptions {
  adopt?: boolean;
}

export async function runNew(nameArg?: string, opts: NewOptions = {}): Promise<number> {
  // BLUEPRINT §10 (v3): 시스템 prompts 박제. 멱등.
  installSystemPresets();

  if (opts.adopt) {
    return await runAdopt(nameArg);
  }

  const name = await resolveName(nameArg);
  if (name === null) return 1;

  // BLUEPRINT §13: vibe new 시작 시 inbox 자동 분류 (있으면).
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

  const exit = await spawnClaude({
    cwd: dir,
    logDir: join(dir, VIBE_LOGS),
    resumeHintProjectName: name,
  });
  return exit;
}

/**
 * BLUEPRINT v3: 일반 프로젝트 입양.
 * 인자 있으면 ~/dev/<name>, 없으면 cwd. 둘 다 디렉토리가 이미 존재해야 함.
 */
async function runAdopt(nameArg?: string): Promise<number> {
  const targetDir = nameArg ? join(DEV_ROOT, nameArg) : process.cwd();
  if (!existsSync(targetDir)) {
    console.error(pc.red(`입양할 디렉토리가 없습니다: ${targetDir}`));
    return 1;
  }

  const name = nameArg ?? basename(targetDir);
  const nameErr = validateProjectName(name);
  if (nameErr) {
    console.error(pc.red(`디렉토리명이 vibe 이름 규칙에 맞지 않습니다: ${name} — ${nameErr}`));
    return 1;
  }

  console.log(pc.dim(`\n  입양: ${targetDir}`));

  let result;
  try {
    result = scaffoldAdopt(targetDir, name);
  } catch (e) {
    console.error(pc.red(`입양 실패: ${(e as Error).message}`));
    return 1;
  }

  // git: 이미 git 레포면 skip, 아니면 init + main + develop
  const isGit = existsSync(join(targetDir, ".git"));
  if (!isGit) {
    try {
      initGitRepo(targetDir, name);
      console.log(pc.dim(`  git init + main/develop 분기`));
    } catch (e) {
      console.error(pc.yellow(`(git 초기화 실패, 무시: ${(e as Error).message})`));
    }
  } else {
    // 이미 git이면 main/develop 브랜치만 보장
    try {
      const branches = execFileSync("git", ["branch", "--list"], {
        cwd: targetDir,
        encoding: "utf8",
      });
      if (!branches.includes("develop")) {
        execFileSync("git", ["checkout", "-b", "develop"], {
          cwd: targetDir,
          stdio: "ignore",
        });
        console.log(pc.dim(`  develop 브랜치 분기 (기존 git 보존)`));
      }
    } catch {
      // ignore
    }
  }

  console.log();
  console.log(pc.green("입양 완료."));
  console.log(pc.dim(`  추가: ${result.added.join(", ") || "(없음)"}`));
  if (result.preserved.length > 0) {
    console.log(pc.dim(`  보존: ${result.preserved.join(", ")}`));
  }
  console.log(pc.dim("\n이제 CEO를 띄웁니다. 기존 코드부터 훑어달라고 부탁해보세요.\n"));

  const exit = await spawnClaude({
    cwd: targetDir,
    logDir: join(targetDir, VIBE_LOGS),
    resumeHintProjectName: name,
  });
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
