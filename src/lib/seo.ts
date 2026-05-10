import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { PRESETS_SEO_DIR } from "./presets.js";
import { ask } from "./prompt.js";

export type SeoStatus = "ok" | "fail" | "manual";

export interface SeoCheck {
  name: string;
  status: SeoStatus;
  detail?: string;
  /** 자동 생성 가능한 항목인지 */
  generatable?: "sitemap" | "robots";
}

export interface SeoFlagOverrides {
  siteUrl?: string;
  yes?: boolean;
}

function appDir(cwd: string): string | null {
  if (existsSync(join(cwd, "app"))) return join(cwd, "app");
  if (existsSync(join(cwd, "src/app"))) return join(cwd, "src/app");
  return null;
}

function publicDir(cwd: string): string | null {
  if (existsSync(join(cwd, "public"))) return join(cwd, "public");
  return null;
}

function hasFavicon(cwd: string, appRoot: string): boolean {
  // app/icon.{ico,png,svg} 또는 public/favicon.{ico,png}
  const candidates = [
    "icon.ico", "icon.png", "icon.svg", "icon.jpg",
    "apple-icon.png", "apple-icon.jpg",
    "favicon.ico",
  ];
  for (const c of candidates) {
    if (existsSync(join(appRoot, c))) return true;
  }
  const pub = publicDir(cwd);
  if (pub) {
    for (const c of ["favicon.ico", "favicon.png", "icon.png", "icon.svg"]) {
      if (existsSync(join(pub, c))) return true;
    }
  }
  return false;
}

function hasLayoutOpenGraph(appRoot: string): boolean {
  for (const p of ["layout.tsx", "layout.ts", "layout.jsx", "layout.js"]) {
    const full = join(appRoot, p);
    if (existsSync(full)) {
      const c = readFileSync(full, "utf8");
      // 단순 휴리스틱: openGraph 키 존재 여부
      if (/\bopenGraph\s*:/.test(c)) return true;
    }
  }
  return false;
}

function hasSitemap(cwd: string, appRoot: string): boolean {
  for (const p of ["sitemap.ts", "sitemap.js", "sitemap.tsx"]) {
    if (existsSync(join(appRoot, p))) return true;
  }
  const pub = publicDir(cwd);
  if (pub && existsSync(join(pub, "sitemap.xml"))) return true;
  return false;
}

function hasRobots(cwd: string, appRoot: string): boolean {
  for (const p of ["robots.ts", "robots.js", "robots.tsx"]) {
    if (existsSync(join(appRoot, p))) return true;
  }
  const pub = publicDir(cwd);
  if (pub && existsSync(join(pub, "robots.txt"))) return true;
  return false;
}

export function runSeoChecks(cwd: string, appRoot: string): SeoCheck[] {
  return [
    {
      name: "sitemap",
      status: hasSitemap(cwd, appRoot) ? "ok" : "fail",
      detail: "app/sitemap.ts 또는 public/sitemap.xml",
      generatable: "sitemap",
    },
    {
      name: "robots",
      status: hasRobots(cwd, appRoot) ? "ok" : "fail",
      detail: "app/robots.ts 또는 public/robots.txt",
      generatable: "robots",
    },
    {
      name: "OpenGraph 메타 (layout.tsx)",
      status: hasLayoutOpenGraph(appRoot) ? "ok" : "manual",
      detail: "metadata.openGraph 키 — 자동 수정은 layout 본 코드 위험. 직접 추가 권장",
    },
    {
      name: "favicon / icon",
      status: hasFavicon(cwd, appRoot) ? "ok" : "manual",
      detail: "app/icon.* 또는 public/favicon.* — 사용자 자료 필요",
    },
  ];
}

function applyVars(template: string, siteUrl: string): string {
  return template.replace(/\{\{SITE_URL\}\}/g, siteUrl);
}

async function generate(
  appRoot: string,
  filename: string,
  templateName: string,
  siteUrl: string,
  autoYes: boolean,
): Promise<{ written: boolean; path: string }> {
  const target = join(appRoot, filename);
  if (existsSync(target) && !autoYes) {
    const ans = await ask(`${target} 이미 있음. 덮어쓸까요? (y/N): `);
    if (ans?.toLowerCase() !== "y") return { written: false, path: target };
  }
  const tmpl = readFileSync(join(PRESETS_SEO_DIR, templateName), "utf8");
  writeFileSync(target, applyVars(tmpl, siteUrl));
  return { written: true, path: target };
}

export interface SeoRunResult {
  checks: SeoCheck[];
  generated: string[];
  skipped: string[];
}

export async function runSeo(flags: SeoFlagOverrides = {}): Promise<SeoRunResult | null> {
  const cwd = process.cwd();
  const appRoot = appDir(cwd);
  if (!appRoot) {
    console.error(pc.red("Next.js App Router 프로젝트가 아닙니다 (app/ 또는 src/app/ 없음)."));
    return null;
  }

  const checks = runSeoChecks(cwd, appRoot);
  const missingGen = checks.filter(
    (c) => c.status === "fail" && c.generatable !== undefined,
  );

  // 자동 생성할 게 있으면 site URL 받기
  let siteUrl = flags.siteUrl;
  if (missingGen.length > 0 && !siteUrl) {
    siteUrl = (await ask("사이트 URL (예: https://myapp.vercel.app): ")) ?? undefined;
    if (!siteUrl) {
      console.error(pc.yellow("\nsite URL 미입력 — sitemap/robots 자동 생성 건너뜀."));
      return { checks, generated: [], skipped: missingGen.map((c) => c.name) };
    }
  }
  // 끝의 / 제거
  if (siteUrl) siteUrl = siteUrl.replace(/\/+$/, "");

  const generated: string[] = [];
  const skipped: string[] = [];

  for (const check of missingGen) {
    if (!siteUrl) break;
    if (check.generatable === "sitemap") {
      const r = await generate(appRoot, "sitemap.ts", "sitemap.ts.tmpl", siteUrl, !!flags.yes);
      (r.written ? generated : skipped).push(r.path);
    } else if (check.generatable === "robots") {
      const r = await generate(appRoot, "robots.ts", "robots.ts.tmpl", siteUrl, !!flags.yes);
      (r.written ? generated : skipped).push(r.path);
    }
  }

  return { checks, generated, skipped };
}
