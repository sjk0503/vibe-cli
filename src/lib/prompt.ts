import { createInterface } from "node:readline/promises";

/**
 * Lightweight readline-based prompt. Resolves to trimmed input.
 * Returns null if stdin closes (Ctrl-D / piped empty input).
 */
export async function ask(question: string): Promise<string | null> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } catch {
    return null;
  } finally {
    rl.close();
  }
}
