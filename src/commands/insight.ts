import pc from "picocolors";
import { organizeInbox } from "../lib/insight.js";

export async function runInsightOrganize(): Promise<number> {
  console.log(pc.dim("inbox 분류 중... (claude 호출)"));
  let result;
  try {
    result = await organizeInbox();
  } catch (e) {
    console.error(pc.red(`organize 실패: ${(e as Error).message}`));
    return 1;
  }

  if (result.moved.length === 0 && result.skipped.length === 0) {
    console.log(pc.dim("inbox가 비어 있습니다."));
    return 0;
  }

  console.log();
  if (result.moved.length > 0) {
    console.log(pc.bold("이동:"));
    for (const m of result.moved) {
      console.log(`  ${pc.green("→")} ${m.file}  ${pc.dim("→")}  ${m.category}/`);
    }
  }
  if (result.newCategories.length > 0) {
    console.log();
    console.log(pc.bold("새 카테고리:"), result.newCategories.join(", "));
  }
  if (result.skipped.length > 0) {
    console.log();
    console.log(pc.bold("건너뜀:"));
    for (const s of result.skipped) console.log(`  ${pc.yellow("·")} ${s}`);
  }
  return 0;
}

export async function runInsightHelp(): Promise<number> {
  console.log(`vibe insight — insight 폴더 관리

서브 명령어:
  ${pc.bold("organize")}   ~/dev/insight/inbox/ 의 파일을 자동 분류

자료 추가는 ~/dev/insight/inbox/ 에 직접 떨어뜨리세요. (BLUEPRINT §13)`);
  return 0;
}
