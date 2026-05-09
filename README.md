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

| 명령어 | 역할 |
|---|---|
| `vibe new [name]` | 새 프로젝트 시작. `~/dev/<name>/`에 scaffold + git(main/develop) + CEO 세션 시동 |
| `vibe resume [name]` | 중단된 프로젝트를 마지막 상태에서 이어감 (목록에서 선택 가능) |
| `vibe ship` | 배포 체크리스트 (랜딩·SEO·결제·분석·약관·env). 미충족이어도 차단 안 함 |
| `vibe insight [organize]` | `~/dev/insight/inbox/` 자료를 자동으로 카테고리 분류 |
| `vibe doctor [accept]` | 환경 점검 + §17.3 지침 헬스체크. `accept`로 변경 인정 + CHANGELOG 기록 |

명령어는 5개로 고정이다 (BLUEPRINT §6). 새 기능은 위 명령어의 sub-option으로 흡수한다.

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

---

## 라이선스 / 배포

개인용 도구. 일반 공개 배포 안 함 (BLUEPRINT §3). 친구에게 공유하려면 이 레포 clone + `npm link`까지 안내. `~/dev/insight/`와 `~/dev/design/`은 각자의 자료 공간이라 따로 채워야 한다.
