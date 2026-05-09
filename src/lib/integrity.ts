import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { CLAUDE_AGENTS } from "./paths.js";

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
 * Compute baseline hashes for the files vibe protects (§17.3 health check):
 * - BLUEPRINT.md (CORE)
 * - CLAUDE.md (CEO persona — PRESET)
 * - .claude/agents/*.md (team-lead prompts — PRESET)
 */
export function computeBaseline(projectDir: string): BaselineHashes {
  const baseline: BaselineHashes = {
    "BLUEPRINT.md": hashFile(join(projectDir, "BLUEPRINT.md")),
    "CLAUDE.md": hashFile(join(projectDir, "CLAUDE.md")),
  };

  const agentsDir = join(projectDir, CLAUDE_AGENTS);
  if (existsSync(agentsDir)) {
    for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const abs = join(agentsDir, entry.name);
      const rel = relative(projectDir, abs);
      baseline[rel] = hashFile(abs);
    }
  }

  return baseline;
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
