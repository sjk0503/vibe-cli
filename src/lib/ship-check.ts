import { existsSync, readFileSync } from "node:fs";

export type CheckStatus = "ok" | "fail" | "manual";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail?: string;
}

export type Stack = "web" | "mobile" | "unknown";

export function detectStack(cwd = process.cwd()): Stack {
  const pkgPath = `${cwd}/package.json`;
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      if (deps.next) return "web";
    } catch {
      // fall through
    }
  }
  if (existsSync(`${cwd}/pubspec.yaml`)) return "mobile";
  return "unknown";
}

interface ShipCheckOutput {
  stack: Stack;
  checks: CheckResult[];
}

export function runShipChecks(cwd = process.cwd()): ShipCheckOutput {
  const stack = detectStack(cwd);
  if (stack === "unknown") {
    return {
      stack,
      checks: [
        {
          name: "프로젝트 스택 감지",
          status: "fail",
          detail: "package.json(next 의존성) 또는 pubspec.yaml 없음 — vibe 프로젝트가 아닌 듯",
        },
      ],
    };
  }
  return {
    stack,
    checks: stack === "web" ? checkWeb(cwd) : checkMobile(cwd),
  };
}

function checkWeb(cwd: string): CheckResult[] {
  const pkg = JSON.parse(readFileSync(`${cwd}/package.json`, "utf8"));
  const deps: Record<string, string> = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };
  const has = (...names: string[]) => names.some((n) => deps[n] !== undefined);
  const exists = (...rels: string[]) => rels.some((r) => existsSync(`${cwd}/${r}`));

  const results: CheckResult[] = [];

  // 랜딩 페이지
  results.push({
    name: "랜딩 페이지",
    status: exists(
      "app/page.tsx",
      "app/page.ts",
      "app/page.jsx",
      "app/page.js",
      "src/app/page.tsx",
      "src/app/page.ts",
      "pages/index.tsx",
      "pages/index.ts",
      "pages/index.jsx",
      "pages/index.js",
    )
      ? "ok"
      : "fail",
  });

  // SEO 메타
  let seo = false;
  for (const p of [
    "app/layout.tsx",
    "app/layout.ts",
    "app/layout.jsx",
    "app/layout.js",
    "src/app/layout.tsx",
    "src/app/layout.ts",
  ]) {
    const full = `${cwd}/${p}`;
    if (existsSync(full)) {
      const c = readFileSync(full, "utf8");
      if (/export\s+(const|let|var)\s+metadata|export\s+(async\s+)?function\s+generateMetadata/.test(c)) {
        seo = true;
        break;
      }
    }
  }
  results.push({ name: "SEO 메타 태그", status: seo ? "ok" : "fail" });

  // 결제 (Toss / Stripe)
  results.push({
    name: "결제 연동 (Toss/Stripe)",
    status: has(
      "stripe",
      "@stripe/stripe-js",
      "@tosspayments/payment-sdk",
      "@tosspayments/widget-sdk",
      "@tosspayments/tosspayments-sdk",
    )
      ? "manual"
      : "fail",
    detail: "패키지 의존성은 검출. 실제 결제 플로우 동작은 수동 확인",
  });

  // 분석
  results.push({
    name: "분석 도구 (PostHog)",
    status: has("posthog-js", "@posthog/react", "@posthog/browser") ? "ok" : "fail",
  });

  // 약관 / 개인정보처리방침
  results.push({
    name: "약관 / 개인정보처리방침",
    status: exists(
      "app/terms",
      "app/privacy",
      "app/legal",
      "src/app/terms",
      "src/app/privacy",
      "pages/terms.tsx",
      "pages/privacy.tsx",
    )
      ? "ok"
      : "fail",
    detail: "한국 서비스 시 필수 (§16)",
  });

  // 환경변수
  results.push({
    name: "환경변수 프로덕션 값",
    status: exists(".env.example") ? "manual" : "fail",
    detail: "Vercel 등 배포 환경에 키가 세팅됐는지 직접 확인",
  });

  return results;
}

function checkMobile(cwd: string): CheckResult[] {
  const yaml = readFileSync(`${cwd}/pubspec.yaml`, "utf8");
  const has = (re: RegExp) => re.test(yaml);

  return [
    {
      name: "결제 (RevenueCat)",
      status: has(/^\s*purchases_flutter:/m) ? "manual" : "fail",
      detail: "패키지 의존성만 검출. 실제 구매 플로우는 수동 확인",
    },
    {
      name: "분석 도구 (PostHog)",
      status: has(/^\s*posthog_flutter:/m) ? "ok" : "fail",
    },
    {
      name: "푸시 (FCM)",
      status: has(/^\s*firebase_messaging:/m) ? "manual" : "fail",
      detail: "패키지 의존성만 검출. APNs/FCM 키 세팅은 수동 확인",
    },
    {
      name: "환경변수 / 빌드 설정",
      status: "manual",
      detail: "Codemagic/Fastlane 환경변수 직접 확인",
    },
  ];
}
