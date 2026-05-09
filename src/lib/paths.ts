import { homedir } from "node:os";
import { join } from "node:path";

/**
 * BLUEPRINT §10: paths are FIXED. Do not introduce env-var or config-file
 * overrides. These constants are the single source of truth.
 */
export const HOME = homedir();
export const DEV_ROOT = join(HOME, "dev");
export const INSIGHT_ROOT = join(DEV_ROOT, "insight");
export const INSIGHT_INBOX = join(INSIGHT_ROOT, "inbox");
export const DESIGN_ROOT = join(DEV_ROOT, "design");

export const VIBE_DIR = ".vibe";
export const VIBE_STATE = `${VIBE_DIR}/state.json`;
export const VIBE_CHANGELOG = `${VIBE_DIR}/CHANGELOG.md`;
export const VIBE_SUGGESTIONS = `${VIBE_DIR}/SUGGESTIONS.md`;
export const VIBE_LOGS = `${VIBE_DIR}/logs`;

export const CLAUDE_DIR = ".claude";
export const CLAUDE_AGENTS = `${CLAUDE_DIR}/agents`;
export const CLAUDE_SKILLS = `${CLAUDE_DIR}/skills`;
