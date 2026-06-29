# 운동 추가 후 기록 카드 화면 표준화 계획

## 상태

- 날짜: 2026-06-25
- 세션: planning
- 트리거: `/diagnose`
- 대상 슬라이스: 운동 추가/선택 후 렌더링 경로 표준화

## 문제

운동 추가 또는 기존 운동 선택 후 화면이 두 가지 방식으로 갈라진다.

- 기준 화면: 기존 운동 기록 화면 안의 `ex-max-v2` 카드와 하단 타이머가 유지되는 화면
- 회귀 화면: `WorkoutDetailScreen` 별도 상세 루트로 전환되어 카드 레이아웃이 달라지는 화면

사용자는 기준 화면을 유지하되, 상단에 뒤로가기 버튼을 제공하고 Android/PWA 뒤로가기 모션도 자연스럽게 동작하기를 요구했다.

## 목표

1. 운동 추가/기존 운동 선택 후 별도 상세 화면으로 이동하지 않고 기존 운동 기록 화면의 해당 카드로 이동한다.
2. 기준 카드 UI와 하단 타이머 UI를 유지한다.
3. 운동 기록 화면 상단에 뒤로가기 버튼을 추가한다.
4. 버튼 뒤로가기와 Android/PWA/browser 뒤로가기는 `WorkoutRecordScreen -> CalendarScreen + 기존 BottomSheet 열린 상태` 규칙을 따른다.
5. 선택 날짜, 캘린더 상태, 바텀시트 상태는 기존 navigation stack/saved state 흐름을 유지한다.

## 실행 범위

- `workout/exercises.js`
  - 운동 선택 후 `pushWorkoutDetail` 호출 경로 제거
  - 선택된 운동 카드를 렌더 후 스크롤/포커스 처리
  - 운동 카드 제목/목표 클릭도 별도 상세 화면 대신 같은 카드 기준 동작으로 통일
- `index.html`, `style.css`
  - 운동 기록 화면 상단 뒤로가기 버튼 추가 및 record mode에서만 노출
- `app.js`
  - 기존 `wtHandleWorkoutBack`/navigation stack 흐름 유지 확인
- `sw.js` 및 versioned import
  - 정적 자산 변경에 따른 cache/import version bump
- 테스트
  - picker selection이 상세 화면 push 대신 기준 카드 포커스 흐름을 사용하는지 검증
  - 운동 기록 화면 뒤로가기 버튼과 캐시 버전 마커 검증

## 완료 기준

- 운동 추가/선택 후 기준 카드 화면이 유지된다.
- 기존 운동 카드는 선택 후 화면 안에서 바로 드러난다.
- 상단 뒤로가기 버튼과 Android/PWA 뒤로가기 모두 캘린더 + 열린 바텀시트 상태로 복귀한다.
- 정적 검사, 관련 회귀 테스트, 배포 마커 검증을 통과한다.
