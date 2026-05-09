import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * BLUEPRINT §15: error logs auto-save to .vibe/logs/.
 * Caller passes the absolute path to .vibe/logs (or undefined to disable).
 * If the directory doesn't exist (e.g. running outside a vibe project),
 * we silently skip — logging must never crash the main flow.
 */
export function writeLog(logDir: string | undefined, label: string, content: string): string | null {
  if (!logDir || !existsSync(logDir)) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const safeLabel = label.replace(/[^a-z0-9-]/gi, "_");
  const file = join(logDir, `${ts}-${safeLabel}.log`);
  try {
    writeFileSync(file, content);
    return file;
  } catch {
    return null;
  }
}
