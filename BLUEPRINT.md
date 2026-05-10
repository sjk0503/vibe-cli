# BLUEPRINT — vibe

> 아이디어가 떠오른 순간부터 배포까지, 한 터미널 안에서 끝내는 바이브 코딩 CLI.

---

## 0. 헌법 (Constitution)

이 문서는 vibe의 헌법이다. vibe(에이전트)는 이 문서를 **읽기만** 하고, 절대 자동 수정하지 않는다. 수정은 사용자가 직접 편집하거나, "BLUEPRINT 업데이트해줘"라고 명시적으로 요청한 경우에만 일어난다. vibe가 작업 중 떠올린 개선 아이디어는 `.vibe/SUGGESTIONS.md`에 누적되며, 사용자가 검토 후 BLUEPRINT에 반영한다.

---

## 1. 한 줄 요약

**vibe**는 Claude Code 위에 얹는 CLI 래퍼로, "기획 → 디자인 → 개발 → 배포 준비"의 전체 흐름을 한 터미널 안에서 끊김 없이 진행하게 해주는 개인용 바이브 코딩 도구다.

---

## 2. 문제 정의

현재 바이브 코딩 워크플로우의 병목:

1. 매 단계마다 도구/공간을 옮겨 다님 (기획 챗 → 파일 저장 → 폴더 이동 → 터미널 → Claude Code 실행 → 디자인 참조 요청)
2. Claude Code의 권한 컨펌 버튼을 매번 눌러야 함
3. 자주 쓰는 참고 자료(API 모음, 오픈소스, 환경변수, 깃 전략 등)를 매번 컨텍스트에 붙여줘야 함
4. 작업이 직렬로만 진행되어 시간 낭비

vibe는 이 네 가지를 모두 제거한다.

---

## 3. 타겟 사용자

- 1차: 제작자 본인
- 2차: 제작자의 친구 1~2명
- 일반 공개 배포 안 함. 인증/온보딩/패키지 배포 인프라 불필요. GitHub clone + 로컬 설치 형태.

---

## 4. 정책적 제약 (Why CLI Wrapper)

Anthropic이 2026년 4월부터 Claude Code SDK의 OAuth 토큰을 서드파티 앱에서 사용하지 못하게 제한했다. 따라서 vibe는:

- Claude Code SDK를 직접 호출하지 않는다
- 사용자 머신에 이미 설치된 Claude Code CLI를 subprocess로 띄운다
- 인증은 사용자 본인의 Claude Code가 알아서 처리한다
- vibe는 "사용자가 자기 Claude Code를 더 잘 쓰게 도와주는 도구"로 포지셔닝되며, ToS와 충돌하지 않는다

---

## 5. 핵심 원칙

1. **한 터미널 원칙**: 아이디어부터 배포 직전까지 한 터미널 세션을 떠나지 않는다
2. **자동이 기본, 컨펌은 선택적**: 권한은 기본 자동 허용, 명시된 포인트에서만 사용자에게 묻는다
3. **플랫폼 무관**: vibe 자체는 웹/앱/게임을 구분하지 않는다. 기획 결과물에 따라 스택이 결정된다
4. **CEO 모델**: 메인 에이전트가 SI 회사의 CEO처럼 팀장들에게 일을 분배한다
5. **계층화된 진화**: 핵심은 박제, 주변은 진화시킨다

---

## 6. 명령어 (총 5개, 추가 금지)

| 명령어 | 역할 |
|---|---|
| `vibe new` | 새 프로젝트 시작. 기획 → 디자인 → 개발 → QA의 전체 흐름 진입 |
| `vibe resume` | 중단된 프로젝트를 마지막 상태에서 이어감 |
| `vibe ship` | 배포 준비 및 실행 (수익화 체크리스트 포함) |
| `vibe insight` | insight 폴더 관리 (추가/조회/자동 분류) |
| `vibe doctor` | 환경 점검 + 지침 헬스체크 |

명령어는 5개로 고정한다. 기능 추가가 필요해도 기존 명령어의 하위 옵션으로 흡수한다.

---

## 7. 에이전트 구조 (SI 회사 모델)
You (사용자, 클라이언트)
↕
CEO (메인 Claude Code 세션)
↓ 일 분배
├─ 기획팀장
├─ 디자인팀장
├─ 프론트팀장
├─ 백엔드팀장
└─ QA팀장

- **CEO**: 사용자와 직접 대화하는 유일한 주체. 전체 프로젝트 흐름을 지휘. 팀장에게 작업 분배. 컨펌이 필요한 순간 사용자에게 질문
- **팀장 5명** (Claude Code 서브에이전트, `.claude/agents/`에 정의): 각자 자기 영역 책임. v1에서는 팀원을 두지 않는다. 필요해지면 팀장이 자기 팀원을 호출하는 구조로 v2에서 확장
- **병렬 정책**: CEO가 상황에 따라 판단. 가이드라인은 "다른 영역(폴더 충돌 없음)이면 병렬, 같은 영역이면 직렬, QA는 항상 마지막"

---

## 8. 표준 워크플로우
vibe new
↓
[기획팀장] 인터랙티브 대화로 BLUEPRINT 템플릿 채움 → BLUEPRINT.md 저장
↓ 컨펌
[디자인팀장] 실제 동작하는 결과물(웹: dev 서버 / Flutter: 시뮬레이터)로 시안 제시
↓ 컨펌
[프론트팀장 + 백엔드팀장] 병렬 진행
↓
[QA팀장] 테스트, 빌드, 검증
↓
vibe ship → 수익화 체크리스트 → 배포


---

## 9. 컨펌 정책

### 자동 (사용자에게 안 물음)
- 파일 생성/수정/삭제
- 패키지 설치
- 빌드/테스트 실행
- 깃 커밋 (develop 브랜치 한정)
- 코드 리팩토링

### 컨펌 필수
- 디자인 시안 확정
- 환경변수/API 키 입력
- 외부 서비스 가입/프로젝트 생성 (Supabase 프로젝트 생성 등)
- 도메인 결정
- main 브랜치 머지
- 깃 푸시
- 배포 실행
- BLUEPRINT 또는 CORE 영역 수정

컨펌은 Claude Code 기본 채팅 인터페이스에서 받는다. Ghostty의 알림 기능이 자동으로 작동한다.

---

## 10. 디렉토리 구조 (고정)
~/.claude/                  # vibe가 관리하는 시스템 prompts (vibe doctor update로 갱신)
├── agents/                 # 팀장 5명 (planner/designer/frontend/backend/qa)
└── skills/                 # insight, design SKILL.md
(CEO 페르소나는 spawn 시 --append-system-prompt로 주입. 사용자 ~/.claude/CLAUDE.md 안 건드림.)

~/dev/
├── <프로젝트명>/            # vibe가 만든 결과물 (모터를 참조만)
│   ├── BLUEPRINT.md        # 프로젝트 헌법 (planner가 채움)
│   ├── .vibe/              # 프로젝트 메타데이터
│   │   ├── state.json      # 진행 상태 + baseline (BLUEPRINT.md만 추적)
│   │   ├── CHANGELOG.md    # BLUEPRINT 변경 기록
│   │   ├── SUGGESTIONS.md  # vibe가 떠올린 개선 누적
│   │   └── logs/           # 에러 로그
│   ├── .claude/            # 옵션 override만 (보통 비어있음. 그 프로젝트만의 customize 필요시 작성)
│   └── (실제 프로젝트 파일들)
│
├── insight/                # 글로벌 지식 베이스 (LEARNED, 자유 누적)
│   ├── inbox/              # 분류 안 된 자료 (사용자가 막 던지는 곳)
│   └── (자동 분류된 카테고리들)
│
└── design/                 # 글로벌 디자인 레퍼런스 (LEARNED)


경로는 고정이다. 환경 설정으로 바꿀 수 없다.

vibe presets는 `~/.claude/`에 시스템으로 설치되며 모든 프로젝트가 참조한다.
`vibe doctor update`로 vibe 본체를 갱신하면 모든 프로젝트가 다음 호출부터 즉시 새 가이드를 인식한다.
프로젝트의 `.claude/`는 그 프로젝트만의 override가 필요할 때만 명시적으로 작성한다.

---

## 11. 깃 전략

- 브랜치 2개: `main`(배포) / `develop`(작업)
- vibe가 자동으로 develop에서 작업, 커밋 (Conventional Commits)
- main 머지 및 푸시는 사용자 컨펌 후
- main 푸시 = 배포 (Vercel 등 자동 트리거)

---

## 12. 기술 스택

### 12-1. vibe 자체의 스택

- **언어**: TypeScript
- **런타임**: Node.js
- **CLI 프레임워크**: commander 또는 oclif (개발 시 결정)
- **Claude Code 호출**: subprocess (`child_process.spawn`)
- **권한 자동 허용**: Claude Code 실행 시 `--dangerously-skip-permissions` 플래그
- **저장소 형태**: GitHub repo, `npm link`로 로컬 설치

### 12-2. vibe가 만들어낼 프로젝트의 PRESET 스택

PRESET이므로 사용자 컨펌 후 수정 가능하다.

**웹**
- 프레임워크: Next.js 15 (App Router) + TypeScript
- 스타일: Tailwind v4 + shadcn/ui
- 백엔드/DB/인증/스토리지: Supabase
- 결제: 토스페이먼츠 (한국) / Stripe (글로벌) / 둘 다 (양쪽 타겟)
- 배포: Vercel
- 분석: PostHog
- 이메일: Resend

**모바일 앱**
- 프레임워크: Flutter
- 상태관리: Riverpod
- 백엔드: Supabase
- 결제: RevenueCat
- 분석: PostHog (Flutter SDK)
- 푸시: Firebase Cloud Messaging
- 배포: Codemagic 또는 Fastlane

**게임 / 기타**
- PRESET에 없음. 첫 시도 시 CEO가 사용자에게 추천 스택을 제시하고 승인 후 PRESET에 추가

---

## 13. insight 시스템

### 입력 방식
- 사용자는 `~/dev/insight/inbox/`에 md/링크/스니펫을 분류 없이 그냥 던진다
- 폴더 구조 강요 안 함. "어디에 넣지" 고민 자체를 제거

### 처리 방식
- `vibe insight organize` 명령 또는 `vibe new`/`vibe doctor` 실행 시 자동으로 inbox를 분류
- vibe가 카테고리를 자율적으로 생성/병합 (예: `apis/`, `oss/`, `pitfalls/` 등)
- 새 프로젝트 시작 시 CEO가 inbox + 분류된 카테고리 모두 훑어봄

### 자동 주입
- vibe 설치/업데이트 시 `~/.claude/skills/insight/SKILL.md`가 `~/dev/insight` 위치를 안내한다.
- 마찬가지로 `~/.claude/skills/design/SKILL.md`가 `~/dev/design` 위치를 안내한다.
- 별도 프로젝트별 셋업 없음. Claude Code의 Skills 기능이 글로벌 SKILL.md를 자동 인식한다.

---

## 14. 디자인 컨펌 방식

상황에 따라 디자인팀장이 적절한 방식 선택:

- 풀 페이지: dev 서버 띄워서 브라우저 미리보기
- 단일 컴포넌트: 가벼운 미리보기 페이지 또는 Storybook
- Flutter: 시뮬레이터 hot reload
- 텍스트 기반(API 응답 형태 등): 콘솔 출력

이미지 시안 생성은 사용하지 않는다. 항상 실제 동작하는 결과물로 컨펌받는다.

---

## 15. 에러 / 막힘 처리

- 에이전트가 같은 에러로 3회 실패하면 사용자에게 컨펌 요청
- 에이전트당 최대 스텝/토큰 한도 설정 (무한 루프 방지)
- 에러 로그는 `.vibe/logs/`에 자동 저장

---

## 16. 수익화 (가벼운 v1)

`vibe ship` 실행 시 체크리스트 출력:

- [ ] 결제 연동 동작 확인
- [ ] 분석 도구 설치 확인
- [ ] 랜딩 페이지 존재
- [ ] SEO 메타 태그
- [ ] 약관 / 개인정보처리방침 (한국 서비스 시)
- [ ] 환경변수 프로덕션 값 세팅

미충족 항목이 있어도 강제로 막지는 않음. 안내만.

---

## 17. 지침 진화 정책 (테세우스의 배 방지)

지침을 3계층으로 분리한다.

### CORE (절대 자동 수정 불가)
- BLUEPRINT.md 자체
- vibe의 철학, 명령어 5개, CEO/팀장 구조, 컨펌 정책, 디렉토리 구조
- 수정은 사용자 직접 편집으로만

### PRESET (자동 수정 제안 → 사용자 컨펌 → 적용)
- 기본 기술 스택
- 자주 쓰는 워크플로우 패턴
- 에이전트 프롬프트
- 사용자 OK 시 변경, 변경 내역은 `.vibe/CHANGELOG.md`에 기록

### LEARNED (자유 누적)
- insight 폴더 콘텐츠
- 프로젝트별 학습 노트
- 에러 케이스 / pitfall 기록

### 안전장치
1. vibe 자체를 깃 레포로 관리. 모든 변경은 커밋으로 추적
2. CHANGELOG.md에 변경 사유 한 줄 기록 강제
3. `vibe doctor`에 지침 헬스체크 포함 (월 1회 권장)
4. vibe가 떠올린 개선 아이디어는 `.vibe/SUGGESTIONS.md`에 누적, 사용자가 BLUEPRINT에 직접 반영

---

## 18. v1 범위 (찍어내기 모드)

**포함**
- 명령어 5개 모두 동작
- 웹/앱 PRESET 스택으로 프로젝트 생성
- CEO + 팀장 5명 에이전트 구조
- insight inbox + 자동 분류
- 권한 자동 허용
- 컨펌 포인트 동작
- main/develop 깃 흐름
- 가벼운 수익화 체크리스트

**제외 (v2 이후)**
- 팀원 서브-서브에이전트
- 복잡한 깃 PR 흐름
- 자동 약관 생성
- SEO 자동 점검
- 일반 배포용 패키지화

---

## 19. 성공 지표

vibe가 성공했다고 판단할 기준:

1. 아이디어가 떠오르고 30분 안에 첫 프로토타입이 dev 서버에서 동작한다
2. 한 주에 새 프로젝트 1개 이상 찍어낼 수 있다
3. Claude Code 권한 버튼을 한 번도 누르지 않는다
4. insight에 자료를 던질 때 "어디에 넣지" 고민하지 않는다
5. 6개월 후에도 BLUEPRINT가 처음 작성한 형태와 본질적으로 동일하다 (CORE 보존)
