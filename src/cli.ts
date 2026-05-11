#!/usr/bin/env node
import { Command } from "commander";
import { runDoctor, runDoctorAccept, runDoctorUpdate } from "./commands/doctor.js";
import { runInsightHelp, runInsightOrganize } from "./commands/insight.js";
import { runNew } from "./commands/new.js";
import { runResume } from "./commands/resume.js";
import { runShip, runShipLegal, runShipSeo } from "./commands/ship.js";

// BLUEPRINT §6: exactly five commands, forever. New capabilities must be
// absorbed as sub-options of an existing command.
const program = new Command();

program
  .name("vibe")
  .description("아이디어부터 배포까지 한 터미널 안에서 끝내는 바이브 코딩 CLI")
  .version("0.1.0");

program
  .command("new")
  .description("새 프로젝트 시작 (기획 → 디자인 → 개발 → QA)")
  .argument("[name]", "프로젝트 이름 (~/dev/<name>/)")
  .option("--adopt", "기존 디렉토리(일반 프로젝트)를 vibe로 입양 (인자 있으면 ~/dev/<name>, 없으면 cwd)")
  .action(async (name: string | undefined, opts: { adopt?: boolean }) =>
    process.exit(await runNew(name, { adopt: opts.adopt })),
  );

program
  .command("resume")
  .description("중단된 프로젝트를 마지막 상태에서 이어감")
  .argument("[name]", "프로젝트 이름 (생략 시 목록에서 선택)")
  .option("-c, --continue", "claude 본체의 가장 최근 대화 세션도 함께 이어감 (claude --continue)")
  .option("--resume [id]", "특정 claude 세션 ID 이어감 (생략 시 picker; claude --resume)")
  .action(
    async (
      name: string | undefined,
      opts: { continue?: boolean; resume?: string | true },
    ) =>
      process.exit(
        await runResume(name, { continue: opts.continue, resumeId: opts.resume }),
      ),
  );

const ship = program
  .command("ship")
  .description("배포 준비 및 실행 (수익화 체크리스트 포함)")
  .action(async () => process.exit(await runShip()));

ship
  .command("legal")
  .description("한국 서비스용 ToS / 개인정보처리방침 baseline 자동 생성 (법무 검토 필수)")
  .option("--service-name <name>", "서비스명")
  .option("--operator <name>", "운영자(개인명/회사명)")
  .option("--contact <contact>", "연락처(이메일 등)")
  .option("--data-items <items>", "수집하는 개인정보 항목 (쉼표 구분)")
  .option("--effective-date <yyyy-mm-dd>", "시행일 (기본: 오늘)")
  .option("-y, --yes", "이미 있는 파일 덮어쓰기 자동 yes")
  .action(async (opts) =>
    process.exit(
      await runShipLegal({
        serviceName: opts.serviceName,
        operator: opts.operator,
        contact: opts.contact,
        dataItems: opts.dataItems,
        effectiveDate: opts.effectiveDate,
        yes: opts.yes,
      }),
    ),
  );

ship
  .command("seo")
  .description("SEO 점검 + sitemap/robots 자동 생성 (OG·favicon은 안내만)")
  .option("--site-url <url>", "사이트 URL (예: https://myapp.vercel.app)")
  .option("-y, --yes", "이미 있는 파일 덮어쓰기 자동 yes")
  .action(async (opts) =>
    process.exit(
      await runShipSeo({ siteUrl: opts.siteUrl, yes: opts.yes }),
    ),
  );

const insight = program
  .command("insight")
  .description("insight 폴더 관리 (추가/조회/자동 분류)")
  .action(async () => process.exit(await runInsightHelp()));

insight
  .command("organize")
  .description("~/dev/insight/inbox/ 자동 분류")
  .action(async () => process.exit(await runInsightOrganize()));

const doctor = program
  .command("doctor")
  .description("환경 점검 + 지침 헬스체크")
  .action(async () => process.exit(await runDoctor()));

doctor
  .command("accept")
  .description("지침 변경을 인정하고 사유를 .vibe/CHANGELOG.md에 기록 + baseline 갱신")
  .action(async () => process.exit(await runDoctorAccept()));

doctor
  .command("update")
  .description("vibe 본체를 origin/main 최신으로 업데이트 (main 브랜치 + ff-only)")
  .action(async () => process.exit(await runDoctorUpdate()));

program.parseAsync(process.argv);
