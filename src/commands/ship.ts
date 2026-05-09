import pc from "picocolors";
import { runShipChecks } from "../lib/ship-check.js";

export async function runShip(): Promise<number> {
  const { stack, checks } = runShipChecks();

  console.log(pc.bold("\nvibe ship 체크리스트\n"));
  console.log(pc.dim(`  스택: ${stack}\n`));

  let failed = 0;
  let manual = 0;
  for (const c of checks) {
    let mark: string;
    if (c.status === "ok") mark = pc.green("✓");
    else if (c.status === "manual") {
      mark = pc.yellow("?");
      manual++;
    } else {
      mark = pc.red("✗");
      failed++;
    }
    const detail = c.detail ? pc.dim(`  — ${c.detail}`) : "";
    console.log(`  ${mark} ${c.name}${detail}`);
  }

  if (stack === "unknown") {
    console.log();
    console.log(pc.red("vibe 프로젝트 안에서 실행해야 합니다."));
    return 1;
  }

  console.log();
  console.log(pc.dim("? = 수동 확인,  ✗ = 미충족"));

  // BLUEPRINT §16: "미충족 항목이 있어도 강제로 막지는 않음. 안내만."
  if (failed === 0) {
    console.log(pc.green("자동 검증 통과."));
  } else {
    console.log(pc.yellow(`${failed}개 미충족. §16에 따라 배포는 차단하지 않습니다.`));
  }
  if (manual > 0) {
    console.log(pc.dim(`${manual}개 항목은 직접 확인이 필요합니다.`));
  }

  // BLUEPRINT §9 / §11: main 푸시 = 배포. 사용자 컨펌 필수 → vibe는 명령어만 안내.
  console.log();
  console.log(pc.bold("배포 (사용자가 직접 실행):"));
  console.log("  git checkout main && git merge develop && git push");
  console.log(pc.dim("  └ main 푸시 = 배포 트리거 (Vercel 등)"));

  return 0;
}
