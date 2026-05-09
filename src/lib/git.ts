import { execFileSync } from "node:child_process";

/**
 * BLUEPRINT §11: every project starts with main + develop branches.
 * Initial commit lives on `main`; vibe agents work on `develop`.
 */
export function initGitRepo(projectDir: string, projectName: string): void {
  const opts = { cwd: projectDir, stdio: "ignore" as const };
  execFileSync("git", ["init", "-b", "main"], opts);
  execFileSync("git", ["add", "."], opts);
  execFileSync(
    "git",
    ["commit", "-m", `chore: vibe new ${projectName}`],
    opts,
  );
  execFileSync("git", ["checkout", "-b", "develop"], opts);
}
