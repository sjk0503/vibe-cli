import { spawn, type SpawnOptions } from "node:child_process";
import { writeLog } from "./log.js";

/**
 * BLUEPRINT §4 / §12-1: vibe never links the Claude Code SDK. It always shells
 * out to the user's installed `claude` CLI and forces --dangerously-skip-permissions
 * so the user never sees a permission prompt (§19 success metric #3).
 *
 * BLUEPRINT §15: errors are logged to .vibe/logs/. Pass `logDir` to enable.
 */
export interface SpawnClaudeOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Initial prompt sent as positional arg */
  prompt?: string;
  /** Extra Claude Code flags appended after the forced ones */
  extraArgs?: string[];
  /** Absolute path to .vibe/logs/. Errors are written here when set. */
  logDir?: string;
}

/** Interactive Claude Code session. stdio is inherited. */
export function spawnClaude(opts: SpawnClaudeOptions = {}): Promise<number> {
  const args = ["--dangerously-skip-permissions", ...(opts.extraArgs ?? [])];
  if (opts.prompt !== undefined) args.push(opts.prompt);

  const spawnOpts: SpawnOptions = {
    cwd: opts.cwd,
    env: opts.env ?? process.env,
    stdio: "inherit",
  };

  const startedAt = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, spawnOpts);
    child.on("error", (err) => {
      writeLog(
        opts.logDir,
        "spawn-claude-error",
        renderMeta({ startedAt, args, cwd: opts.cwd, error: err.message }),
      );
      reject(err);
    });
    child.on("exit", (code, signal) => {
      if (code !== 0 || signal) {
        writeLog(
          opts.logDir,
          "spawn-claude-exit",
          renderMeta({ startedAt, args, cwd: opts.cwd, exit: code, signal }),
        );
      }
      resolve(code ?? 0);
    });
  });
}

export interface PromptClaudeOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Extra Claude Code flags appended after the forced ones */
  extraArgs?: string[];
  /** Absolute path to .vibe/logs/. Errors are written here when set. */
  logDir?: string;
}

/**
 * One-shot, non-interactive Claude Code call (`claude --print`). Captures
 * stdout and resolves with the trimmed response. Use this when vibe needs a
 * structured answer from the model rather than handing the terminal over.
 *
 * BLUEPRINT §15: 무한 루프/비용 폭주 안전망. promptClaude는 --print 전용이라
 * --max-budget-usd 가 동작한다 (인터랙티브 spawnClaude에는 옵션 자체가 없음).
 * 정상 호출은 $0.05 미만이라 $1은 안전망 의미.
 */
const PROMPT_MAX_BUDGET_USD = "1";

export function promptClaude(prompt: string, opts: PromptClaudeOptions = {}): Promise<string> {
  const args = [
    "--dangerously-skip-permissions",
    "--print",
    "--max-budget-usd",
    PROMPT_MAX_BUDGET_USD,
    ...(opts.extraArgs ?? []),
    prompt,
  ];

  const startedAt = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      process.stderr.write(chunk);
    });
    child.on("error", (err) => {
      writeLog(
        opts.logDir,
        "prompt-claude-error",
        renderMeta({ startedAt, args, cwd: opts.cwd, error: err.message, prompt, stderr }),
      );
      reject(err);
    });
    child.on("exit", (code) => {
      if (code !== 0) {
        writeLog(
          opts.logDir,
          "prompt-claude-exit",
          renderMeta({ startedAt, args, cwd: opts.cwd, exit: code, prompt, stdout, stderr }),
        );
        reject(new Error(`claude --print exited with code ${code}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

interface MetaInput {
  startedAt: string;
  args: string[];
  cwd?: string;
  exit?: number | null;
  signal?: NodeJS.Signals | null;
  error?: string;
  prompt?: string;
  stdout?: string;
  stderr?: string;
}

function renderMeta(m: MetaInput): string {
  const lines = [
    `startedAt: ${m.startedAt}`,
    `endedAt:   ${new Date().toISOString()}`,
    `cwd:       ${m.cwd ?? process.cwd()}`,
    `args:      ${JSON.stringify(m.args)}`,
  ];
  if (m.exit !== undefined) lines.push(`exit:      ${m.exit}`);
  if (m.signal) lines.push(`signal:    ${m.signal}`);
  if (m.error) lines.push(`error:     ${m.error}`);
  if (m.prompt) lines.push(`\n--- prompt ---\n${m.prompt}`);
  if (m.stdout) lines.push(`\n--- stdout ---\n${m.stdout}`);
  if (m.stderr) lines.push(`\n--- stderr ---\n${m.stderr}`);
  return lines.join("\n") + "\n";
}
