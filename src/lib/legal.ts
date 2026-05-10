import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { PRESETS_LEGAL_DIR } from "./presets.js";
import { ask } from "./prompt.js";

interface LegalVars {
  SERVICE_NAME: string;
  OPERATOR: string;
  CONTACT: string;
  DATA_ITEMS: string;
  EFFECTIVE_DATE: string;
}

export interface LegalFlagOverrides {
  serviceName?: string;
  operator?: string;
  contact?: string;
  dataItems?: string;
  effectiveDate?: string;
  yes?: boolean; // 덮어쓰기 컨펌 자동 yes
}

interface LegalGenerateResult {
  written: string[];
  skipped: string[];
}

/** Detect Next.js App Router app/ directory (or src/app/). */
function appDir(cwd: string): string | null {
  if (existsSync(join(cwd, "app"))) return join(cwd, "app");
  if (existsSync(join(cwd, "src/app"))) return join(cwd, "src/app");
  return null;
}

function applyVars(template: string, vars: LegalVars): string {
  return template
    .replace(/\{\{SERVICE_NAME\}\}/g, vars.SERVICE_NAME)
    .replace(/\{\{OPERATOR\}\}/g, vars.OPERATOR)
    .replace(/\{\{CONTACT\}\}/g, vars.CONTACT)
    .replace(/\{\{DATA_ITEMS\}\}/g, vars.DATA_ITEMS)
    .replace(/\{\{EFFECTIVE_DATE\}\}/g, vars.EFFECTIVE_DATE);
}

async function collectVars(flags: LegalFlagOverrides): Promise<LegalVars | null> {
  const today = new Date().toISOString().slice(0, 10);

  const SERVICE_NAME = flags.serviceName ?? (await ask("서비스명 (예: 메모앱): "));
  if (!SERVICE_NAME) return null;

  const OPERATOR = flags.operator ?? (await ask("운영자 (개인명/회사명): "));
  if (!OPERATOR) return null;

  const CONTACT = flags.contact ?? (await ask("연락처 (이메일 등): "));
  if (!CONTACT) return null;

  const DATA_ITEMS =
    flags.dataItems ?? (await ask("수집하는 개인정보 항목 (예: 이메일, 닉네임): "));
  if (!DATA_ITEMS) return null;

  let EFFECTIVE_DATE = flags.effectiveDate;
  if (!EFFECTIVE_DATE) {
    const dateInput = await ask(`시행일 (기본 ${today}, Enter로 사용): `);
    EFFECTIVE_DATE = dateInput && dateInput.length > 0 ? dateInput : today;
  }

  return { SERVICE_NAME, OPERATOR, CONTACT, DATA_ITEMS, EFFECTIVE_DATE };
}

async function writeOne(
  cwd: string,
  appRoot: string,
  routeName: string,
  templateName: string,
  vars: LegalVars,
  result: LegalGenerateResult,
  autoYes: boolean,
): Promise<void> {
  const targetDir = join(appRoot, routeName);
  const targetFile = join(targetDir, "page.tsx");
  if (existsSync(targetFile) && !autoYes) {
    const ans = await ask(`${targetFile.replace(cwd + "/", "")} 이미 있음. 덮어쓸까요? (y/N): `);
    if (ans?.toLowerCase() !== "y") {
      result.skipped.push(targetFile);
      return;
    }
  }
  const tmpl = readFileSync(join(PRESETS_LEGAL_DIR, templateName), "utf8");
  const content = applyVars(tmpl, vars);
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(targetFile, content);
  result.written.push(targetFile);
}

export async function generateLegalPages(
  flags: LegalFlagOverrides = {},
): Promise<LegalGenerateResult | null> {
  const cwd = process.cwd();
  const appRoot = appDir(cwd);
  if (!appRoot) {
    console.error(
      pc.red("Next.js App Router 프로젝트가 아닙니다 (app/ 또는 src/app/ 없음)."),
    );
    return null;
  }

  console.log(pc.dim("\n약관 생성에 필요한 5개 정보를 입력해주세요. 빈 입력 시 취소.\n"));
  const vars = await collectVars(flags);
  if (!vars) {
    console.error(pc.red("취소됨 (필수 정보 누락)."));
    return null;
  }

  const result: LegalGenerateResult = { written: [], skipped: [] };
  await writeOne(cwd, appRoot, "terms", "terms.tsx.tmpl", vars, result, !!flags.yes);
  await writeOne(cwd, appRoot, "privacy", "privacy.tsx.tmpl", vars, result, !!flags.yes);
  return result;
}
