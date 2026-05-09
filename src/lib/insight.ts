import { mkdirSync, readFileSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { INSIGHT_INBOX, INSIGHT_ROOT } from "./paths.js";
import { promptClaude } from "./spawn-claude.js";

const PREVIEW_BYTES = 500;

interface InboxItem {
  filename: string;
  preview: string;
}

interface ClassifiedItem {
  file: string;
  category: string;
}

function listInboxFiles(): string[] {
  let entries;
  try {
    entries = readdirSync(INSIGHT_INBOX, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .map((e) => e.name);
}

function listExistingCategories(): string[] {
  let entries;
  try {
    entries = readdirSync(INSIGHT_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && e.name !== "inbox" && !e.name.startsWith("."))
    .map((e) => e.name);
}

function readPreview(absPath: string): string {
  try {
    const buf = readFileSync(absPath);
    const slice = buf.subarray(0, PREVIEW_BYTES).toString("utf8");
    // Collapse whitespace so the prompt stays compact.
    return slice.replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function buildPrompt(items: InboxItem[], categories: string[]): string {
  const categoriesLine =
    categories.length > 0 ? categories.map((c) => `"${c}"`).join(", ") : "(none yet)";

  const lines = items.map(
    (it) => `- "${it.filename}": "${it.preview.slice(0, PREVIEW_BYTES)}"`,
  );

  return `다음은 ~/dev/insight/inbox/에 있는 분류 안 된 자료들이야.

기존 카테고리 폴더: ${categoriesLine}

각 파일을 가장 적절한 카테고리에 배치해줘.
- 적합한 기존 카테고리가 있으면 그걸 사용.
- 없으면 새 카테고리 생성. 카테고리 이름은 영문 소문자, 짧고 명확하게 (예: apis, oss, pitfalls, prompts, env-vars).
- 카테고리 이름은 ^[a-z][a-z0-9-]*$ 만 허용 (소문자/숫자/하이픈, 영문 시작).

응답은 **JSON 배열만**. 다른 설명, 인사말, 마크다운 코드펜스(\`\`\`) 절대 금지.
형식: [{"file": "원본 파일명", "category": "카테고리 폴더명"}]

자료 목록:
${lines.join("\n")}`;
}

function extractJsonArray(raw: string): unknown {
  let text = raw.trim();
  // Strip code fences if present.
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence?.[1]) text = fence[1].trim();
  // Locate first '[' and last ']' as a fallback against chatty preamble/epilogue.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text);
}

const CATEGORY_RE = /^[a-z][a-z0-9-]{0,31}$/;

function validateClassification(value: unknown, expectedFiles: Set<string>): ClassifiedItem[] {
  if (!Array.isArray(value)) {
    throw new Error("응답이 배열이 아닙니다");
  }
  const result: ClassifiedItem[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      throw new Error("배열 항목이 객체가 아닙니다");
    }
    const file = (entry as Record<string, unknown>).file;
    const category = (entry as Record<string, unknown>).category;
    if (typeof file !== "string" || typeof category !== "string") {
      throw new Error("file/category 필드가 문자열이 아닙니다");
    }
    if (!expectedFiles.has(file)) {
      throw new Error(`알 수 없는 파일 분류: ${file}`);
    }
    if (!CATEGORY_RE.test(category)) {
      throw new Error(`부적합한 카테고리 이름: ${category}`);
    }
    result.push({ file, category });
  }
  return result;
}

interface OrganizeResult {
  moved: ClassifiedItem[];
  newCategories: string[];
  skipped: string[];
}

/**
 * BLUEPRINT §13: vibe new / vibe doctor 실행 시 자동으로 inbox 분류.
 * 비어있으면 조용히 skip, 자료가 있을 때만 한 줄 보고. 실패해도 호출자 흐름을 막지 않음.
 */
export async function autoOrganizeIfAny(label: "vibe new" | "vibe doctor"): Promise<void> {
  const filenames = listInboxFiles();
  if (filenames.length === 0) return;

  // picocolors는 호출자가 가져왔을 거지만 여기서 직접 import하지 않고 평문으로 둔다.
  console.log(`\n  [${label}] inbox에 ${filenames.length}개 자료 발견 — 자동 분류 중...`);

  let result: OrganizeResult;
  try {
    result = await organizeInbox();
  } catch (e) {
    console.warn(`  (자동 분류 실패, 무시하고 계속: ${(e as Error).message})`);
    return;
  }

  if (result.moved.length > 0) {
    for (const m of result.moved) {
      console.log(`    → ${m.file}  →  ${m.category}/`);
    }
  }
  if (result.newCategories.length > 0) {
    console.log(`    새 카테고리: ${result.newCategories.join(", ")}`);
  }
  if (result.skipped.length > 0) {
    console.log(`    건너뜀: ${result.skipped.length}개`);
  }
  console.log();
}

export async function organizeInbox(): Promise<OrganizeResult> {
  const filenames = listInboxFiles();
  if (filenames.length === 0) {
    return { moved: [], newCategories: [], skipped: [] };
  }

  const items: InboxItem[] = filenames.map((filename) => ({
    filename,
    preview: readPreview(join(INSIGHT_INBOX, filename)),
  }));
  const existing = listExistingCategories();

  const prompt = buildPrompt(items, existing);
  const raw = await promptClaude(prompt, { cwd: INSIGHT_ROOT });

  const parsed = extractJsonArray(raw);
  const classified = validateClassification(parsed, new Set(filenames));

  const existingSet = new Set(existing);
  const newCategoriesSet = new Set<string>();
  const moved: ClassifiedItem[] = [];
  const skipped: string[] = [];

  for (const item of classified) {
    const targetDir = join(INSIGHT_ROOT, item.category);
    if (!existingSet.has(item.category) && !newCategoriesSet.has(item.category)) {
      mkdirSync(targetDir, { recursive: true });
      newCategoriesSet.add(item.category);
    }
    const src = join(INSIGHT_INBOX, item.file);
    const dst = join(targetDir, item.file);
    try {
      // If the destination already has a same-named file, skip rather than overwrite.
      try {
        statSync(dst);
        skipped.push(`${item.file} (이미 ${item.category}/에 존재)`);
        continue;
      } catch {
        // dst doesn't exist — proceed
      }
      renameSync(src, dst);
      moved.push(item);
    } catch (e) {
      skipped.push(`${item.file} (이동 실패: ${(e as Error).message})`);
    }
  }

  // Detect files the model didn't classify.
  const classifiedFiles = new Set(classified.map((c) => c.file));
  for (const fname of filenames) {
    if (!classifiedFiles.has(fname)) {
      skipped.push(`${fname} (모델 응답에서 누락)`);
    }
  }

  return {
    moved,
    newCategories: [...newCategoriesSet],
    skipped,
  };
}
