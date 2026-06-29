# NPC 아트에셋 제작 워크플로우 규칙 리뷰

## 상태

- 상태: `pass`
- 계획 문서: `docs/ai/features/2026-06-29-npc-asset-workflow-rules.md`
- 리뷰일: 2026-06-29

## 리뷰 결과

1. `docs/ai/NPC_ASSET_WORKFLOW.md`가 홈탭 NPC 작업의 기본 산출물을 홈 배치용 스프라이트와 모달용 아트에셋으로 분리해 명시한다.
2. NPC 전용 공간/소품 overlay, 홈탭 원근, 기존 방 좌표계, 크기 비교, 도형/스티커형 결과 폐기 기준이 포함되어 있다.
3. imagegen 프롬프트, PNG 후처리, DOM 이름표, 전구 버튼, `life-zone:npc-quest` 이벤트, 모달 직접 바인딩 규칙이 포함되어 있다.
4. `AGENTS.md`에 NPC/라이프존 캐릭터 작업 전 해당 문서를 읽도록 하는 짧은 진입 규칙이 추가됐다.

## 검증

1. `git diff --check`
2. `rg -n "NPC_ASSET_WORKFLOW|NPC|라이프존 캐릭터" AGENTS.md docs/ai/NPC_ASSET_WORKFLOW.md docs/ai/NEXT_ACTION.md`

## 잔여 리스크

- 문서 규칙 추가 작업이므로 앱 런타임 UI 변경은 없다. 이후 실제 NPC 구현 시 이 문서의 체크리스트를 계획 문서에 반영해야 한다.
