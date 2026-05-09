---
name: insight-knowledge-base
description: 사용자의 글로벌 지식 베이스(~/dev/insight/) — 외부 API, 오픈소스 추천, 환경변수 패턴, 과거 pitfall, 프롬프트 템플릿 등 사용자가 모아둔 자료. 새 프로젝트를 시작하거나, 외부 서비스를 연동하거나, 막힌 문제를 풀 때 먼저 여기를 확인해야 한다.
---

# insight (글로벌 지식 베이스)

이 skill은 사용자의 `~/dev/insight/` 디렉토리에 누적된 자료를 조회하기 위한 가이드다. (BLUEPRINT §13)

## 위치와 구조

- 루트: `~/dev/insight/`
- `inbox/` — 사용자가 막 던지고 분류 안 된 자료. 모든 카테고리에 들어가기 전 단계.
- `<카테고리>/` — `vibe insight organize`로 자동 분류된 폴더들. 예: `apis/`, `oss/`, `pitfalls/`, `prompts/`, `env-vars/`. 카테고리는 사용자 자료가 쌓이면서 자동 생성된다.

## 언제 이 skill을 발동해야 하는가

다음 상황에서 **반드시** `~/dev/insight/`를 먼저 훑는다:

1. **새 프로젝트 시작 직후** — `Bash("ls ~/dev/insight")`로 카테고리 목록 확인. 프로젝트 도메인과 관련 있어 보이는 카테고리 안의 파일을 `Read`.
2. **외부 서비스/API/SDK를 결정하기 전** — `Bash("ls ~/dev/insight/apis/")` 등에서 사용자가 이미 메모해둔 추천이 있는지 확인.
3. **에러나 알 수 없는 동작에 막혔을 때** — `pitfalls/` 폴더에 같은 함정에 대한 메모가 있을 수 있음.
4. **환경변수, 비밀, 도메인 이름 같은 결정** — `env-vars/`, `secrets/`, `domains/` 등 관련 카테고리 확인.

## 어떻게 사용하는가

```
1. Bash("ls ~/dev/insight")  # 카테고리 목록
2. Bash("ls ~/dev/insight/<카테고리>")  # 관련 카테고리의 파일 목록
3. Read("~/dev/insight/<카테고리>/<파일>")  # 자세히 읽기
4. inbox/도 함께 훑기 (분류 전 자료가 더 적합할 수 있음)
```

## 갱신 정책

자료는 사용자가 직접 추가한다. 새 자료가 inbox에 떨어지면 사용자가 `vibe insight organize`로 분류한다. 너(Claude)는 이 자료를 **읽기만** 하고 직접 수정/추가하지 마라.

## 한 줄

`~/dev/insight/`는 사용자의 외부 두뇌다. 모르는 게 있으면 답하기 전에 먼저 거길 본다.
