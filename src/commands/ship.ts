import pc from "picocolors";
import { generateLegalPages, type LegalFlagOverrides } from "../lib/legal.js";
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

/**
 * BLUEPRINT §16: 한국 서비스용 ToS / 개인정보처리방침 baseline 자동 생성.
 * AI 호출 없이 정적 템플릿 + 변수 치환 (법률 문서 hallucination 방지).
 * 결과물 상단에 "법무 검토 필수" 면책 박제.
 */
export async function runShipLegal(flags: LegalFlagOverrides = {}): Promise<number> {
  console.log(pc.bold("\nvibe ship legal — ToS / 개인정보처리방침 baseline 생성"));
  console.log(pc.yellow("⚠ 법무 검토 필수. 변호사 검토 없이 그대로 사용하지 마세요."));

  const result = await generateLegalPages(flags);
  if (!result) return 1;

  console.log();
  if (result.written.length > 0) {
    console.log(pc.green("작성됨:"));
    for (const f of result.written) console.log(`  ${pc.green("✓")} ${f}`);
  }
  if (result.skipped.length > 0) {
    console.log(pc.dim("\n건너뜀:"));
    for (const f of result.skipped) console.log(`  ${pc.dim("·")} ${f}`);
  }
  console.log();
  console.log(pc.dim("이제 vibe ship 체크리스트의 \"약관 / 개인정보처리방침\" 항목이 통과합니다."));
  console.log(pc.yellow("배포 전 변호사 검토를 받으세요."));
  return 0;
}
