import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEV_ROOT } from "./paths.js";

export interface VibeProject {
  name: string;
  dir: string;
  phase?: string;
  createdAt?: string;
}

/**
 * Enumerate vibe-managed projects under ~/dev/. A project counts as vibe-
 * managed when it has a `.vibe/state.json` (BLUEPRINT §10).
 */
export function listVibeProjects(): VibeProject[] {
  let entries;
  try {
    entries = readdirSync(DEV_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }

  const projects: VibeProject[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(DEV_ROOT, entry.name);
    const stateFile = join(dir, ".vibe/state.json");
    if (!existsSync(stateFile)) continue;

    const proj: VibeProject = { name: entry.name, dir };
    try {
      const raw = JSON.parse(readFileSync(stateFile, "utf8"));
      if (typeof raw.phase === "string") proj.phase = raw.phase;
      if (typeof raw.createdAt === "string") proj.createdAt = raw.createdAt;
    } catch {
      // ignore corrupt state — still list the project
    }
    projects.push(proj);
  }

  projects.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return projects;
}
