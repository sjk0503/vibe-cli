#!/usr/bin/env node
import { Command } from "commander";
import { runDoctor, runDoctorAccept, runDoctorUpdate } from "./commands/doctor.js";
import { runInsightHelp, runInsightOrganize } from "./commands/insight.js";
import { runNew } from "./commands/new.js";
import { runResume } from "./commands/resume.js";
import { runShip } from "./commands/ship.js";

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
  .action(async (name?: string) => process.exit(await runNew(name)));

program
  .command("resume")
  .description("중단된 프로젝트를 마지막 상태에서 이어감")
  .argument("[name]", "프로젝트 이름 (생략 시 목록에서 선택)")
  .action(async (name?: string) => process.exit(await runResume(name)));

program
  .command("ship")
  .description("배포 준비 및 실행 (수익화 체크리스트 포함)")
  .action(async () => process.exit(await runShip()));

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
