import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Resolve the bundled `presets/` directory regardless of whether vibe was
 * invoked from a `tsx`-driven dev run (src/lib/...) or a built+linked install
 * (dist/lib/...). Both layouts share the same `../../presets` relative path
 * from any file under src/lib or dist/lib.
 */
const here = dirname(fileURLToPath(import.meta.url));
export const PRESETS_DIR = resolve(here, "../../presets");
export const PRESETS_CLAUDE_MD = resolve(PRESETS_DIR, "CLAUDE.md");
export const PRESETS_AGENTS_DIR = resolve(PRESETS_DIR, "agents");
export const PRESETS_SKILLS_DIR = resolve(PRESETS_DIR, "skills");
export const PRESETS_LEGAL_DIR = resolve(PRESETS_DIR, "legal-templates");
export const PRESETS_SEO_DIR = resolve(PRESETS_DIR, "seo-templates");
