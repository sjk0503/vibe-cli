import { createInterface, type Interface } from "node:readline/promises";

/**
 * 모듈 singleton readline. 매 호출마다 createInterface + close하면 stdin이
 * 닫혀서 두 번째 ask부터 EOF로 null만 받음. 한 번 만들고 process가 끝날 때
 * 자연 정리되게 둔다 (commands는 process.exit으로 종료).
 */
let rl: Interface | null = null;

function getRl(): Interface {
  if (!rl) rl = createInterface({ input: process.stdin, output: process.stdout });
  return rl;
}

/** Trimmed input. Returns null on stdin close (Ctrl-D / piped empty). */
export async function ask(question: string): Promise<string | null> {
  try {
    const answer = await getRl().question(question);
    return answer.trim();
  } catch {
    return null;
  }
}

/** Optionally call before process.exit if you want deterministic cleanup. */
export function closePrompt(): void {
  rl?.close();
  rl = null;
}
