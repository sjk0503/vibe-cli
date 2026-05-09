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
| `vibe ship` | 배포 체크리스트 | — |
| `vibe insight` | 글로벌 인사이트 폴더 관리 | `organize` |
| `vibe doctor` | 환경 점검 + 지침 헬스체크 | `accept` |

명령어는 **5개로 고정** (BLUEPRINT §6). 신기능은 위 명령어의 **서브명령**으로 흡수한다 — 6번째 top-level 명령은 추가하지 않는다.

각 명령어의 sub-command 목록은 항상 `vibe <명령어> --help`로 확인할 수 있다.

### `vibe new [name]`

새 프로젝트 시작.

- **인자**: `name` (선택). 생략하면 prompt로 묻는다. 형식 `^[a-z0-9][a-z0-9-]{0,49}$` (소문자/숫자로 시작, 50자 이내).
- **동작 순서**:
  1. `~/dev/<name>/` 생성 (이미 있으면 거부)
  2. `~/dev/insight/inbox/`, `~/dev/design/`이 없으면 같이 생성 (멱등)
  3. CEO 페르소나(`CLAUDE.md`), 5팀장 정의(`.claude/agents/*.md`), 인사이트 심볼릭 링크(`.claude/skills` → `~/dev/insight`) 셋업
  4. `BLUEPRINT.md` placeholder + `.vibe/{state.json,CHANGELOG.md,SUGGESTIONS.md,logs/}` 생성. baseline hash가 `state.json`에 박제됨 (§17.3)
  5. `git init` + `main` 브랜치 + 첫 커밋 + `develop` 분기·체크아웃
  6. CEO 세션 시동 (`claude --dangerously-skip-permissions`) — cwd가 새 프로젝트라 CEO 페르소나가 자동 주입됨

### `vibe resume [name]`

중단된 프로젝트를 마지막 상태에서 이어감.

- **인자**: `name` (선택)
  - 줬는데 그 프로젝트가 없으면 → `프로젝트 없음: <name>` + `exit 1`
  - 안 줬으면 → `~/dev/*` 중 `.vibe/state.json`을 가진 프로젝트들을 createdAt 내림차순으로 나열, 번호 또는 이름으로 선택
  - 목록이 1개뿐이면 자동 선택 (선택 단계 생략)
  - 목록이 비어있으면 → `재개할 vibe 프로젝트가 없습니다` + `exit 1`
- **동작**: 선택된 프로젝트 디렉토리에서 CEO 세션 시동. CEO가 `state.json` / `git log` / 마지막 phase를 읽고 어디서부터 이어갈지 판단한다.

### `vibe ship`

배포 직전 수익화 체크리스트 (BLUEPRINT §16).

- **인자 없음.** cwd가 vibe 프로젝트(`package.json`+`next` 또는 `pubspec.yaml`)여야 함. 아니면 "스택 unknown"으로 종료.
- **검사 항목** (웹 기준): 랜딩 페이지, SEO 메타 태그, 결제(Toss/Stripe) 의존성, 분석(PostHog), 약관/개인정보처리방침 라우트, 환경변수 정의(`.env.example`)
- **결과 표기**: `✓` 통과 / `?` 수동 확인 필요 / `✗` 미충족
- **차단하지 않음** — `✗`가 있어도 안내만. 마지막에 `git checkout main && git merge develop && git push` 명령어를 출력해 사용자가 직접 실행하도록 한다 (main 푸시 = 배포 트리거, 컨펌 필수).

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

---

## 디렉토리 구조 (고정)

```
~/dev/
├── <project>/            # vibe new로 생성되는 프로젝트들
│   ├── BLUEPRINT.md      # 프로젝트 기획서
│   ├── CLAUDE.md         # CEO 페르소나
│   ├── .vibe/            # 메타 (state.json, CHANGELOG, SUGGESTIONS, logs/)
│   ├── .claude/
│   │   ├── agents/       # 5팀장 정의 (planner/designer/frontend/backend/qa)
│   │   └── skills/       # → ~/dev/insight 심볼릭 링크
│   └── (실제 프로젝트 파일들)
│
├── insight/              # 글로벌 지식 베이스 (사용자 본인이 채움)
│   ├── inbox/            # 분류 안 된 자료 — 그냥 떨어뜨리는 곳
│   └── (자동 분류된 카테고리들)
│
└── design/               # 글로벌 디자인 레퍼런스 (사용자 본인이 채움)
```

**경로는 환경변수나 설정으로 바꿀 수 없다** (BLUEPRINT §10).

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
