import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * claude code는 세션을 `~/.claude/projects/<encoded-cwd>/<uuid>.jsonl`에 저장한다.
 * 인코딩 규칙: cwd의 슬래시(`/`)를 하이픈(`-`)으로 치환.
 *   예) `/Users/foo/dev/x` → `-Users-foo-dev-x`
 */
const PROJECTS_ROOT = join(homedir(), ".claude", "projects");

export function encodeCwd(cwd: string): string {
  return cwd.replace(/\//g, "-");
}

/**
 * 해당 cwd로 띄운 claude 세션 jsonl 중 가장 최근 mtime의 UUID.
 * `afterMs`를 주면 그 시점 이후 갱신된 것만 고려 (spawn 시작 직전 timestamp).
 * 못 찾으면 null.
 */
export function findLatestSessionId(cwd: string, afterMs?: number): string | null {
  const dir = join(PROJECTS_ROOT, encodeCwd(cwd));
  if (!existsSync(dir)) return null;

  try {
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".jsonl"))
      .map((e) => ({
        id: e.name.replace(/\.jsonl$/, ""),
        mtime: statSync(join(dir, e.name)).mtimeMs,
      }))
      .filter((e) => (afterMs ? e.mtime >= afterMs : true))
      .sort((a, b) => b.mtime - a.mtime);
    return entries[0]?.id ?? null;
  } catch {
    return null;
  }
}
