import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type BaselineHashes = Record<string, string | null>;

export function hashFile(absPath: string): string | null {
  if (!existsSync(absPath)) return null;
  try {
    return createHash("sha256").update(readFileSync(absPath)).digest("hex");
  } catch {
    return null;
  }
}

/**
 * BLUEPRINT v3 모델: baseline은 BLUEPRINT.md만 추적한다.
 * CLAUDE.md / .claude/agents·skills는 ~/.claude/ 시스템에서 오므로 프로젝트가
 * 자기 복사본을 들고 있지 않다 (override만 옵션). 따라서 추적할 PRESET 파일이
 * 프로젝트 단위에 없음.
 */
export function computeBaseline(projectDir: string): BaselineHashes {
  return {
    "BLUEPRINT.md": hashFile(join(projectDir, "BLUEPRINT.md")),
  };
}

export type DriftKind = "modified" | "deleted" | "added";

export interface DriftEntry {
  path: string;
  kind: DriftKind;
}

export function detectDrift(projectDir: string, baseline: BaselineHashes): DriftEntry[] {
  const drift: DriftEntry[] = [];
  const current = computeBaseline(projectDir);

  for (const [path, expected] of Object.entries(baseline)) {
    const actual = current[path];
    if (actual === undefined || actual === null) {
      drift.push({ path, kind: "deleted" });
    } else if (actual !== expected) {
      drift.push({ path, kind: "modified" });
    }
  }

  // Files added under .claude/agents/ that weren't in baseline.
  for (const path of Object.keys(current)) {
    if (baseline[path] === undefined) {
      drift.push({ path, kind: "added" });
    }
  }

  return drift;
}
