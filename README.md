# vibe

> 아이디어가 떠오른 순간부터 배포까지, 한 터미널 안에서 끝내는 바이브 코딩 CLI.

Claude Code 위에 얹는 얇은 CLI 래퍼. 메인 Claude 세션을 **CEO**로 두고 5명의 팀장(기획·디자인·프론트·백엔드·QA) 서브에이전트에게 일을 분배해서, 한 터미널 안에서 기획 → 디자인 → 개발 → 배포 준비까지 끊김 없이 진행한다.

상세 철학·정책·범위는 [`BLUEPRINT.md`](./BLUEPRINT.md)가 헌법이다.

---

## 사전 요구사항

- **Node.js ≥ 20**
- **[Claude Code CLI](https://docs.claude.com/claude-code)** 설치 + 본인 계정 로그인 완료 (`which claude`로 확인)
- **git**
- (선택) macOS 기준. 다른 OS에서는 미검증.

> vibe는 Claude Code SDK를 직접 호출하지 않고, 사용자 머신에 이미 설치된 `claude` CLI를 subprocess로 띄운다 (BLUEPRINT §4). 인증은 사용자 본인의 Claude Code가 알아서 처리한다.

---

## 설치

```bash
git clone https://github.com/sjk0503/vibe-cli.git ~/dev/vibe
cd ~/dev/vibe
npm install   # postinstall 훅이 dist/를 빌드함
npm link      # `vibe` 명령을 글로벌에 노출
vibe doctor   # 환경 점검
```

`vibe doctor`가 모두 ✓면 준비 완료.

---

## 명령어 (총 5개, 고정)

| 명령어 | 역할 | 서브명령 |
|---|---|---|
| `vibe new [name]` | 새 프로젝트 시작 | — |
| `vibe resume [name]` | 중단된 프로젝트 이어가기 | — |
| `vibe ship` | 배포 체크리스트 | `legal`, `seo` |
| `vibe insight` | 글로벌 인사이트 폴더 관리 | `organize` |
| `vibe doctor` | 환경 점검 + 지침 헬스체크 | `accept`, `update` |

명령어는 **5개로 고정** (BLUEPRINT §6). 신기능은 위 명령어의 **서브명령**으로 흡수한다 — 6번째 top-level 명령은 추가하지 않는다.

각 명령어의 sub-command 목록은 항상 `vibe <명령어> --help`로 확인할 수 있다.

### `vibe new [name]`

새 프로젝트 시작.

- **인자**: `name` (선택). 생략하면 prompt로 묻는다. 형식 `^[a-z0-9][a-z0-9-]{0,49}$`.
- **옵션**: `--adopt` — 기존 디렉토리(일반 프로젝트)를 vibe로 입양. 인자 있으면 `~/dev/<name>`, 없으면 cwd.
- **동작 순서 (기본, 새 프로젝트)**:
  1. `~/.claude/agents·skills/` 시스템 prompts 동기화 (멱등)
  2. inbox에 자료 있으면 자동 organize
  3. `~/dev/<name>/` 생성 (이미 있으면 거부 — 입양은 `--adopt`로)
  4. `~/dev/insight/inbox/`, `~/dev/design/` 없으면 같이 생성
  5. `BLUEPRINT.md` placeholder + `.vibe/{state.json,CHANGELOG,SUGGESTIONS,logs/}` 생성. baseline hash는 BLUEPRINT.md만 추적
  6. `git init` + `main` 브랜치 + 첫 커밋 + `develop` 분기·체크아웃
  7. CEO 세션 시동 (`--append-system-prompt`로 CEO 페르소나 주입)
- **동작 순서 (`--adopt`)**:
  1. 시스템 prompts 동기화
  2. 대상 디렉토리(`~/dev/<name>` 또는 cwd)가 존재해야 함
  3. `.vibe/`, `.gitignore` 없으면 추가, 있으면 보존. `BLUEPRINT.md`도 없으면 placeholder, 있으면 보존
  4. git이 없으면 `git init` + main + develop. 이미 git이면 develop만 보장
  5. CEO 세션 시동 — "기존 코드부터 훑어달라"고 부탁해보면 자연스러움

### `vibe resume [name]`

중단된 프로젝트를 마지막 상태에서 이어감.

- **인자**: `name` (선택)
  - 줬는데 그 프로젝트가 없으면 → `프로젝트 없음: <name>` + `exit 1`
  - 안 줬으면 → `~/dev/*` 중 `.vibe/state.json`을 가진 프로젝트들을 createdAt 내림차순으로 나열, 번호 또는 이름으로 선택
  - 목록이 1개뿐이면 자동 선택 (선택 단계 생략)
  - 목록이 비어있으면 → `재개할 vibe 프로젝트가 없습니다` + `exit 1`
- **옵션** (둘 다 선택, claude 본체 플래그 패스스루):
  - `-c, --continue` — cwd의 가장 최근 claude **대화 세션 자체**를 그대로 이어감. 점심 먹고 와서 같은 작업 계속할 때.
  - `--resume [id]` — 특정 claude 세션 ID로 점프 (claude CLI와 동일 시그니처). ID 생략 시 picker.
  - 둘 다 안 주면 (기본) — **새 세션** + CEO가 `state.json` / `git log` / 마지막 phase를 읽고 재구성. 며칠 만에 돌아왔을 때 추천.
- **동작**: 선택된 프로젝트 디렉토리로 들어가 CEO 세션 시동.
- **종료 시**: 방금 띄운 claude 세션의 UUID를 찾아 다음에 똑같이 이어가는 명령어를 한 줄 안내 (`vibe resume <name> --resume <uuid>`).

### `vibe ship`

배포 직전 수익화 체크리스트 (BLUEPRINT §16).

- **인자 없음.** cwd가 vibe 프로젝트(`package.json`+`next` 또는 `pubspec.yaml`)여야 함. 아니면 "스택 unknown"으로 종료.
- **검사 항목** (웹 기준): 랜딩 페이지, SEO 메타 태그, 결제(Toss/Stripe) 의존성, 분석(PostHog), 약관/개인정보처리방침 라우트, 환경변수 정의(`.env.example`)
- **결과 표기**: `✓` 통과 / `?` 수동 확인 필요 / `✗` 미충족
- **차단하지 않음** — `✗`가 있어도 안내만. 마지막에 `git checkout main && git merge develop && git push` 명령어를 출력해 사용자가 직접 실행하도록 한다 (main 푸시 = 배포 트리거, 컨펌 필수).

#### `vibe ship legal`

한국 서비스용 이용약관 / 개인정보처리방침 baseline 자동 생성.

- AI 호출 없이 **정적 템플릿 + 변수 치환** (법률 문서 hallucination 방지).
- 인터랙티브 또는 플래그로 입력: `--service-name`, `--operator`, `--contact`, `--data-items`, `--effective-date`, `-y`(덮어쓰기 자동 yes)
- App Router 자동 감지 → `app/terms/page.tsx`, `app/privacy/page.tsx` 작성
- 결과물 상단·CLI 출력에 **"법무 검토 필수"** 면책 박제
- 생성 후 `vibe ship` 체크리스트의 "약관 / 개인정보처리방침" 항목이 ✓로 통과

#### `vibe ship seo`

SEO 점검 + 자동 생성 가능 항목 처리.

- **점검 4개**: sitemap, robots, OpenGraph 메타(layout.tsx), favicon
- **자동 생성**: `app/sitemap.ts`, `app/robots.ts` (Next.js 15 App Router 형식). `--site-url <url>` 필요
- **자동 생성 안 함**: OG meta는 layout 본 코드 위험, favicon은 사용자 자료 필요 — 직접 추가 안내만
- 옵션: `--site-url`, `-y`

### `vibe insight`

글로벌 인사이트 폴더(`~/dev/insight/`) 관리.

- `vibe insight` (단독) → 사용법 안내 출력
- `vibe insight organize` → `~/dev/insight/inbox/`의 모든 파일을 `claude --print`에 보내 카테고리 폴더로 자동 분류·이동
  - 적합한 기존 카테고리가 있으면 거기로
  - 없으면 새 카테고리 폴더 자동 생성 (영문 소문자, 예: `apis/`, `oss/`, `pitfalls/`)
  - 같은 이름 충돌 시 skip (덮어쓰기 안 함)
  - inbox가 비어있으면 no-op
- 결과로 이동/새 카테고리/skip 항목을 한 번에 보여준다.

### `vibe doctor`

환경 점검 + 지침 헬스체크.

- `vibe doctor` (단독)
  - 환경: `claude` CLI / Node ≥ 20 / `git` / `~/dev/insight[/inbox]` / `~/dev/design` / `BLUEPRINT.md`
  - 지침 헬스체크 (vibe 프로젝트 안에서만): `state.json.baseline`과 현재 파일 hash를 비교해 변경된 파일을 **CORE / PRESET 카테고리로 나눠** 출력
- `vibe doctor accept`
  - 위 drift 항목들을 다시 보여주고 변경 사유를 한 줄 입력받음 (**빈 입력 거부** — §17 안전장치 #2)
  - `.vibe/CHANGELOG.md`에 `- YYYY-MM-DD: <사유>\n  └ <변경 파일 목록>` 형식으로 한 줄 추가
  - `state.json.baseline`을 현재 hash로 갱신 → 다음 `vibe doctor`에서 drift 사라짐
- `vibe doctor update`
  - vibe 본체(이 레포)를 `origin/main` 최신으로 갱신
  - **현재 브랜치가 `main`이어야 동작** (다른 브랜치에서 강제 pull은 작업물 위험)
  - `git pull origin main --ff-only` + `npm install` (postinstall 훅이 자동 빌드)
  - **마지막에 `~/.claude/agents·skills/` 시스템 prompts 동기화** → 모든 vibe 프로젝트가 다음 호출부터 즉시 새 가이드 인식 (마이그 불필요)
  - `vibe doctor` 실행 시 main 브랜치 + `behind > 0`이면 한 줄 알림 (develop 작업 중이면 silent)

---

## 디렉토리 구조 (고정)

```
~/.claude/                  # vibe가 관리하는 시스템 prompts (vibe doctor update로 갱신)
├── agents/                 # 5팀장 (planner/designer/frontend/backend/qa)
└── skills/                 # insight, design SKILL.md
                            # CEO 페르소나는 spawn 시 --append-system-prompt로 주입
                            # 사용자 ~/.claude/CLAUDE.md 는 안 건드림

~/dev/
├── <project>/              # vibe가 만든 결과물 — 시스템 prompts를 참조만
│   ├── BLUEPRINT.md        # 프로젝트 헌법 (planner가 채움)
│   ├── .vibe/              # 메타 (state.json, CHANGELOG, SUGGESTIONS, logs/)
│   ├── .claude/            # 옵션 override만 (보통 비어있음)
│   └── (실제 프로젝트 파일들)
│
├── insight/                # 글로벌 지식 베이스 (사용자 본인이 채움)
│   ├── inbox/              # 분류 안 된 자료 — 그냥 떨어뜨리는 곳
│   └── (자동 분류된 카테고리들)
│
└── design/                 # 글로벌 디자인 레퍼런스 (사용자 본인이 채움)
```

**경로는 환경변수나 설정으로 바꿀 수 없다** (BLUEPRINT §10).

vibe presets는 `~/.claude/`에 시스템으로 박제되며 모든 프로젝트가 *참조*만 한다 (자기 사본을 들지 않음). 그래서:
- `vibe doctor update`로 vibe 본체를 갱신하면 모든 프로젝트가 다음 호출부터 즉시 새 가이드 인식 — **마이그레이션 불필요**
- 프로젝트의 `.claude/`는 그 프로젝트만의 *override*가 필요할 때만 명시적으로 작성

---

## 첫 사용 흐름

```bash
# 1. 환경 점검
vibe doctor

# 2. 자료가 있으면 inbox에 떨어뜨려 두기 (선택)
mv ~/Downloads/some-api-notes.md ~/dev/insight/inbox/
vibe insight organize   # 카테고리 자동 생성·분류

# 3. 새 프로젝트
vibe new my-app
# → CEO가 인터뷰 시작. 규모/타겟/v1 기능/데이터/제약 5가지를 한 번에 한 질문씩 확인
# → 합의되면 BLUEPRINT 채우고 → 디자인 → 구현 → QA 순서로 진행

# 4. 작업 중단 후 다시
vibe resume my-app

# 5. 배포 직전
vibe ship   # 체크리스트 출력
git checkout main && git merge develop && git push   # main 푸시 = 배포 트리거
```

---

## insight / design 채우기

이 두 폴더는 **각자 본인이 채우는** 글로벌 자료 공간이다. vibe 레포에 박제되지 않는다 (사람마다 자료가 다르니까).

- `~/dev/insight/inbox/` — md 노트, 링크, 스니펫을 분류 없이 그냥 던진다. `vibe insight organize`가 카테고리 폴더(`apis/`, `oss/`, `pitfalls/` 등)를 자율적으로 만들어준다.
- `~/dev/design/` — 디자인 레퍼런스 (스크린샷, 무드보드 링크, 디자인 시스템 노트 등).

새 프로젝트가 만들어질 때 `~/dev/insight`는 자동으로 그 프로젝트의 `.claude/skills/`에 심볼릭 링크되므로, Claude Code의 Skills 기능이 필요할 때 자동으로 트리거한다 (BLUEPRINT §13).

---

## 깃 흐름 (BLUEPRINT §11)

- 두 브랜치: `main`(배포) / `develop`(작업)
- vibe가 `develop`에 자동 커밋 (Conventional Commits)
- `main` 머지·푸시는 사용자 컨펌 필수
- `main` 푸시 = 프로덕션 배포 (Vercel 등 자동 트리거)

---

## 지침 헬스체크 (§17.3)

`vibe new`는 BLUEPRINT.md, CLAUDE.md, `.claude/agents/*.md`의 sha256을 `state.json.baseline`에 박제한다. 이후 `vibe doctor`가 변경된 파일을 CORE / PRESET 카테고리로 나눠 알려준다. 의도된 변경이면:

```bash
vibe doctor accept
# → 변경 사유 한 줄 입력 → .vibe/CHANGELOG.md 기록 + baseline 갱신
```

빈 사유는 거부된다 (§17 안전장치 #2).

---

## 트러블슈팅

| 증상 | 확인 |
|---|---|
| `vibe doctor`에서 `claude CLI installed ✗` | `which claude`. 없으면 Claude Code 먼저 설치. |
| `vibe new` 시작 직후 `Error: Input must be provided either through stdin...` | 터미널이 TTY가 아닐 때 (pipe 등). 일반 터미널에서 직접 실행. |
| 같은 에러로 에이전트가 막힘 | `.vibe/logs/<timestamp>-*.log` 확인 (BLUEPRINT §15). |
| `~/dev/insight` 카테고리가 마음에 안 듦 | 직접 `mv`로 옮기면 됨. 정답은 없음. |
