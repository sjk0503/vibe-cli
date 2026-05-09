import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * vibe 패키지 루트 (BLUEPRINT §17 안전장치 #1: vibe 자체를 깃 레포로 관리).
 * dist/lib/... 또는 src/lib/... 어느 쪽에서 호출되어도 ../.. 가 패키지 루트.
 */
const here = dirname(fileURLToPath(import.meta.url));
export const VIBE_PACKAGE_DIR = resolve(here, "../..");

export function isGitRepo(dir: string): boolean {
  return existsSync(resolve(dir, ".git"));
}

/** 빠른 fetch — 네트워크 없거나 timeout이면 silent. doctor 호출 지연 최소화. */
export function tryFetchOriginMain(packageDir: string, timeoutMs = 3000): boolean {
  try {
    execFileSync("git", ["fetch", "origin", "main"], {
      cwd: packageDir,
      stdio: "ignore",
      timeout: timeoutMs,
    });
    return true;
  } catch {
    return false;
  }
}

/** 마지막 fetch 이후 origin/main이 HEAD보다 몇 커밋 앞서있는가. */
export function countBehindOriginMain(packageDir: string): number | null {
  try {
    const out = execFileSync("git", ["rev-list", "--count", "HEAD..origin/main"], {
      cwd: packageDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return Number(out.trim());
  } catch {
    return null;
  }
}

export function currentBranch(packageDir: string): string | null {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd: packageDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || null;
  } catch {
    return null;
  }
}

export interface UpdateResult {
  ok: boolean;
  message: string;
}

/**
 * vibe doctor update 본체.
 * - main 브랜치에서만 실행 (다른 브랜치에서 강제 pull은 사용자 작업물 위험)
 * - git pull --ff-only (fast-forward만 허용)
 * - npm install (postinstall 훅이 자동 빌드)
 */
export function runUpdate(packageDir: string): UpdateResult {
  if (!isGitRepo(packageDir)) {
    return {
      ok: false,
      message: `${packageDir} 가 git 레포가 아닙니다 (zip 다운로드 등 수동 설치). git clone으로 다시 받아야 합니다.`,
    };
  }

  const branch = currentBranch(packageDir);
  if (branch !== "main") {
    return {
      ok: false,
      message: `vibe doctor update는 main 브랜치에서만 동작합니다. 현재 브랜치: ${branch ?? "(unknown)"}.`,
    };
  }

  try {
    execFileSync("git", ["pull", "origin", "main", "--ff-only"], {
      cwd: packageDir,
      stdio: "inherit",
    });
  } catch (e) {
    return {
      ok: false,
      message: `git pull 실패: ${(e as Error).message}. 로컬 main에 다른 커밋이 있을 수 있습니다.`,
    };
  }

  try {
    execFileSync("npm", ["install"], {
      cwd: packageDir,
      stdio: "inherit",
    });
  } catch (e) {
    return {
      ok: false,
      message: `npm install 실패: ${(e as Error).message}.`,
    };
  }

  return { ok: true, message: "vibe 업데이트 완료." };
}
