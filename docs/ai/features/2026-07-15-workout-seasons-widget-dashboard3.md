# 운동 시즌·8/6/3 재시작·대형 APK 위젯 Dashboard3 계획

## 1. 목표와 이번 범위

현재 TomatoFarm Lite를 단일 기준선으로 삼아 다음을 작은 슬라이스로 구현하고
Dashboard3에서만 먼저 검증한다.

1. 시즌 종료 뒤에도 원본 기록은 보존하되, 이전 시즌 표시는 현재 시즌보다 차분하게
   페이드 처리한다.
2. 새 시즌은 등록 종목 자체는 유지하면서 웬들러 주차, 성장 보드, 볼륨/강도 트랙을
   새 목표로 W1부터 다시 시작한다.
3. 웬들러 종목은 현재 lite에 이미 포함된 `w863-original-v1` 7주 원본 프로그램을 새
   시즌 기본값으로 사용한다.
4. APK에는 시즌 운동 스트릭을 중심으로 러닝·헬스의 주간 계획 달성도와 성장 추세를
   한 화면에 보여 주는 대형 홈 화면 위젯을 추가한다.

이번 범위에서는 식단 시즌화, 운동 탭 전체 재디자인, 기존 원본 운동 문서 일괄 수정,
TomatoFarm 운영 Pages 배포를 하지 않는다.

## 2. 2026-07-15 기준선 감사

### Lite 기준선

- 소스 기준선: `f95144a` (`origin/main`)
- 시즌 런타임은 현재 없다. `data/season-model.js`, 시즌 통합 테스트 등은 원복되어
  목업과 과거 계획 문서만 남아 있다.
- `workout/w863-original.js`와 `tests/w863-original.test.js`가 존재하며,
  스쿼트/OHP/데드리프트/벤치의 7주 원본 표, 1RM 비례 스케일링, W7 회복,
  `templateVersion: 'w863-original-v1'` 계약이 이미 Max V4와 Growth v2에 연결되어 있다.
- 러닝 통계에는 거리, 시간, 평균/최고 페이스, 심박, 고도, 칼로리 집계가 있다.
- 헬스 통계에는 종목별 볼륨, 추정 1RM, 주당 유효 세트, 계획 대비 볼륨 계산이 있다.

### Dashboard3 상태

- 원격 `Dashboard3/main`은 `a8bfd2f`이며, lite와 갈라진 이전 시즌/UI 시도다.
- 이 원격을 개발 기준으로 이어 가지 않는다. lite 기준 통합 브랜치에서 승인된 변경만
  만들고 Dashboard3에 배포한다.
- 배포 시 `origin` 기본값을 신뢰하지 않고 `dashboard3` remote와 `HEAD:main`을
  명시한다. 비선형 이력이므로 마지막 원격 SHA를 확인한 뒤 `--force-with-lease`가
  필요한지 별도 판단한다. 무조건 force push하지 않는다.

### 기존 APK 위젯

- `StreakWidget` 4×1, `WeekWidget` 4×2, `MonthWidget` 4×4가 이미 있다.
- 세 위젯은 더 이상 사용하지 않으므로 새 대형 위젯을 넣는 Slice 5에서 Manifest,
  Kotlin provider, XML layout/provider info, 전용 drawable/string과 함께 제거한다.
- 기존 `WidgetUtils`의 Firestore REST/API key 경로도 함께 제거한다. 로그인된 사용자의
  시즌 스냅샷은 웹 앱의 `data.js`를 통해 계산한 뒤 Capacitor 플러그인으로 네이티브
  저장소에 전달한다.

## 3. 제품 계약

### 3.1 시즌 경계

- 시즌은 `startDate`와 `endDate`가 모두 있는 닫힌 날짜 범위다.
- 시즌끼리 겹치지 않으며, 생성 뒤 시작일/종료일은 원칙적으로 변경하지 않는다.
- 오늘이 범위 안이면 `current`, 종료 뒤면 `archived`, 시작 전이면 `scheduled`다.
- 다음 시즌은 미리 예약할 수 있다. 날짜가 바뀌면 범위로 현재 시즌을 결정하므로
  자정에 원본 기록을 옮기거나 덮어쓰는 작업은 없다.
- 다음 시즌 없이 종료일을 지나면 새 기록을 막지 않는다. 대신 `시즌 종료 · 새 시즌
  설정 필요` 상태로 기록하고, 시즌 목표/처방 자동 진행은 일시 정지한다.

### 3.2 보존 범위

- `workouts/{YYYY-MM-DD}` 원본 문서, 사진, 러닝 경로 참조, 세트 기록은 삭제·복사·일괄
  수정하지 않는다.
- 운동 종목, 헬스장, 기구 같은 전역 자산은 유지한다.
- 날짜가 속한 시즌은 시즌 레지스트리의 날짜 범위로 계산한다. 일별 문서에 `seasonId`를
  소급 저장하지 않는다.
- 이전 시즌 날짜 기록은 계속 열람하고 수정할 수 있다. 다만 이전 시즌 계획 자체는
  당시 처방을 재현하기 위해 읽기 전용 스냅샷으로 둔다.
- 이전 시즌 기록 수정은 그 시즌 통계만 바꾸고 현재 시즌의 추천, 직전 기록, PR,
  스트릭, 볼륨/강도 목표에는 영향을 주지 않는다.

### 3.3 데이터 모델

Firestore 접근과 쓰기는 모두 `data.js` 공개 API를 통한다.

```text
settings/season_registry
  schemaVersion: 2
  seasons[]:
    id, name, startDate, endDate, createdAt, sourceVersion

settings/season_<seasonId>_workout_plan
  schemaVersion
  createdFromSeasonId
  programVersion: "w863-original-v1"
  weeklySessionTarget
  registeredExerciseIds[]

settings/season_<seasonId>_test_board_v2
  해당 시즌의 Growth v2 보드/볼륨/강도/Wendler 설정 스냅샷

settings/season_<seasonId>_running_plan
  weeklyDistanceKm, weeklySessions, optionalDurationMin
```

기존 설정을 `setDoc`으로 덮지 않는다. 새 시즌 문서를 새 키로 만들고, 원본 설정을
복사해야 할 때는 사진 필드를 포함한 기존 일별 문서와 완전히 분리한다.

## 4. 이전 시즌 페이드 UI

첨부된 운동 달력에서 미래 날짜가 낮은 대비로 물러나고 오늘과 현재 기록이 앞으로
나오는 방식을 시즌 경계에 적용한다.

### 표시 규칙

- 현재 시즌: 기존 앱의 텍스트·운동 칩·러닝 칩·선택선 색을 그대로 사용한다.
- 이전 시즌: 배경을 중립 회색으로, 색상 채도를 약 45% 수준으로 낮추고 테두리와
  보조 아이콘 대비를 줄인다.
- 컨테이너 전체에 `opacity`를 주지 않는다. 작은 글자 가독성과 클릭 영역까지 약해지는
  문제를 막기 위해 텍스트/배경/테두리 토큰을 각각 바꾼다.
- 이전 시즌의 본문 글자는 흰 배경에서 최소 AA 대비가 나오는 중성색을 사용한다.
- 시즌 시작일에는 `새 시즌` 라벨과 2px 경계선을 함께 표시해 색에만 의존하지 않는다.
- 지난 날짜를 선택하면 선택 외곽선은 선명하게 복원하고, 상세 시트에는 `지난 시즌`
  배지를 표시한다. 상세 내용은 읽기 편하도록 정상 대비로 보여 준다.
- 캘린더 셀뿐 아니라 왼쪽 웬들러/볼륨/강도 계획 레일도 같은 날짜 경계 뒤에서는
  `종료된 계획` 톤으로 낮춘다.

### 적용 표면

1. 운동 월간 달력 셀과 월 요약
2. 웬들러/볼륨/강도 계획 레일
3. 지난 날짜 상세의 시즌 배지
4. 통계의 기본 `현재 시즌` 범위와 명시적인 `이전 시즌/전체` 선택

운동 탭 전체 레이아웃, 글꼴, 카드 구조는 이번 슬라이스에서 바꾸지 않는다.

## 5. 새 시즌 재설정 흐름

새 시즌 시작은 한 번의 확인 버튼으로 과거 설정을 조용히 복제하지 않고, 다음의 짧은
마법사에서 새 출발 값을 확인한다.

1. **기간**: 시즌 이름, 시작일, 종료일
2. **등록 종목**: 기존 종목 목록은 유지하고 이번 시즌에 사용할 종목을 확인
3. **웬들러**: 기존 웬들러 종목을 `8/6/3 원본`으로 표시하고 리프트 프로필,
   현재 1RM, 증량폭, 반올림 단위를 확인
4. **볼륨/강도**: 각 트랙의 시작 kg·reps를 새로 확인
5. **러닝 계획**: 주간 거리, 주간 횟수, 선택 시간 목표 설정
6. **영향 미리보기**: 유지 항목과 재시작 항목을 나눠 표시
7. **최종 시작**: 트랜잭션으로 시즌 레지스트리와 시즌별 계획 문서를 함께 생성

### 초기값 규칙

- 등록 종목의 정체성과 전역 메타데이터는 유지한다.
- 웬들러 `cycleNo`, `startWeek`, 수행/정산 상태는 새 시즌에서 `1`로 시작한다.
- 새 시즌 웬들러는 `scheme: 'w863'`, `templateVersion: 'w863-original-v1'`를 고정하고
  기존 운동명으로 프로필을 추론하되 사용자가 최종 확인한다.
- 1RM과 볼륨/강도 시작값은 이전 시즌의 마지막 유효 완료 기록으로 미리 채울 수 있지만,
  이전 계획값을 확정값으로 자동 복사하지 않는다.
- W7은 회복 주이며 성장 실패 판정에서 제외하고, 완료 뒤 한 번만 다음 사이클을 정산한다.
- 새 시즌 트랜잭션은 `clientRequestId`를 사용해 이중 탭/재시도 중복 생성을 막는다.

## 6. 시즌 통계와 스트릭 계약

### 스트릭

- 위젯의 주 지표는 식단이 섞이지 않은 `시즌 운동 스트릭`이다.
- 운동 성공은 기존 `isExerciseDaySuccess` 계약을 재사용해 헬스 또는 저장된 러닝을
  포함한다.
- 오늘이 아직 미완료여도 어제까지 이어진 스트릭을 0으로 만들지 않고, 별도
  `오늘 미완료` 상태로 표시한다.
- 조회는 현재 시즌 시작일에서 멈추므로 새 시즌 첫날에는 이전 시즌 연속 기록을
  이어 붙이지 않는다.

### 러닝

- 현재 주: `실제 거리 / 주간 목표 거리`, `완료 횟수 / 계획 횟수`
- 성장: 완료된 최근 2주와 그 전 2주의 거리 및 거리 가중 평균 페이스 비교
- 표본이 2주 미만이면 억지 증감률 대신 `기준 수집 중`을 표시

### 헬스

- 현재 주: 완료한 계획 항목 수 / 예정 항목 수
- 볼륨 성장: 완료된 최근 주와 직전 완료 주의 유효 볼륨 비교
- 강도 성장: 주요 리프트의 현재 추정 1RM과 시즌 시작 1RM 차이
- 웬들러는 볼륨/강도 트랙과 섞지 않고 `Wn · 완료 리프트/계획 리프트`로 별도 집계

현재 주 달성률과 장기 성장률을 같은 숫자로 합치지 않는다. 중간 주차의 낮은 누적값을
퇴보로 오판하지 않도록 성장 비교는 완료된 주끼리만 한다.

## 7. 대형 APK 위젯

### 정보 구조

```text
┌──────────────────────────────────┐
│ 여름 시즌 · W2 · 43일 남음    ↻ │
│ 🔥 6일 연속        오늘 기록 전 │
│ 월  화  수  목  금  토  일       │
│ ●  ●  ●  ●  ●  ●  ○            │
├──────────────────────────────────┤
│ 러닝          12.4 / 20 km  62% │
│ 2 / 3회 · 최근 페이스 8초 향상   │
├──────────────────────────────────┤
│ 헬스              계획 3 / 4    │
│ 볼륨 +8% · 1RM +2.5kg · W2      │
├──────────────────────────────────┤
│ 다음 계획  스쿼트 W2 · 러닝 5km │
│ [운동 기록]            [러닝 시작]│
│ 10:32 동기화                     │
└──────────────────────────────────┘
```

### 상용 앱에서 가져올 원칙

- Duolingo처럼 스트릭 길이와 `오늘 했는가`를 가장 먼저 보여 주고, 완료 전에는 행동을
  유도하며 완료 뒤에는 축하 상태로 바꾼다.
- Habitify처럼 스트릭과 수치 목표 진행률을 분리해 각각 한눈에 읽히게 한다.
- Google Fit처럼 핵심 활동 요약과 목표 근접도를 상단에 모으되, 상세 분석은 앱으로
  들어가 확인하게 한다.

참고:

- https://blog.duolingo.com/widget-feature/
- https://feedback.habitify.me/changelog/habitify-android-240-new-widgets-for-current-streak-and-current
- https://support.google.com/fit/answer/6090183

### Android 구현 선택

- 1차는 기존 APK 구조와 같은 XML `RemoteViews`를 사용한다. Glance/Compose 의존성을
  함께 도입하지 않아 기능 검증 범위를 줄인다.
- 새 `SeasonDashboardWidget`을 추가하는 동일 변경에서 기존 3개 위젯을 삭제한다.
  중간 커밋/APK에 위젯이 하나도 없는 상태는 만들지 않는다.
- 권장 배치는 4×6 대형이며 최소 4×4까지 줄일 수 있게 한다. 런처 격자에 의존하지
  않고 `onAppWidgetOptionsChanged`의 실제 dp 범위로 large/compact 두 레이아웃을 고른다.
- 4×4에서는 다음 계획 상세와 보조 성장 지표를 줄이고, 스트릭·러닝·헬스 달성률은
  항상 남긴다.
- 터치 영역은 48dp 이상, 명암 테마, 로딩/로그아웃/데이터 없음/오래된 스냅샷 상태,
  위젯 선택기 preview를 제공한다.
- Android 12 이상은 시스템 위젯 모서리 반경을 사용하고, 이전 버전만 16dp fallback을
  사용한다.

Android 공식 근거:

- 반응형 크기와 glanceable 정보: https://developer.android.com/develop/ui/views/appwidgets/overview
- 48dp 터치, preview, 빈 상태, 수동 새로고침: https://developer.android.com/docs/quality-guidelines/widget-quality
- 데이터 변경 시 즉시 갱신과 주기 갱신: https://developer.android.com/develop/ui/compose/glance/glance-app-widget

### 데이터 흐름

```text
Firestore → data.js → 시즌 범위 selector → WidgetDashboard Capacitor plugin
          → SharedPreferences JSON snapshot → RemoteViews 렌더
```

- 새 네이티브 위젯은 Firestore REST/API key를 직접 사용하지 않는다.
- 초기 로그인 로드, `sheet:saved`, 시즌 변경, 앱 resume 때 스냅샷을 다시 계산한다.
- 스냅샷은 `schemaVersion`, `generatedAt`, 시즌, 스트릭, 최근 일자 상태, 러닝,
  헬스, 다음 계획만 포함하고 사진/러닝 원본 좌표는 넣지 않는다.
- 위젯 버튼은 화이트리스트된 intent action만 사용한다. 러닝 카드는 운동 탭의 러닝
  진입으로, 헬스 카드는 오늘 운동 상세로 연결한다.
- 수동 새로고침은 캐시를 즉시 다시 그린 뒤 앱을 열어 `data.js` 동기화를 요청한다.
  동기화 시각이 오래됐으면 값 대신 `앱을 열어 업데이트` 상태를 명시한다.

## 8. 실행 슬라이스와 승인 게이트

### Slice 0 — 기준선 고정

- lite `f95144a`에서 Dashboard3 전용 통합 브랜치 생성
- 원격 `a8bfd2f`와 lite 차이를 기록하고 배포 lease SHA 고정
- 기존 8/6/3, 러닝, 운동 입력 집중 테스트 통과

완료 게이트: 코드 변경 없이 기준선/검증 결과를 사용자에게 확인받는다.

### Slice 1 — 시즌 순수 모델과 계산 경계

- 시즌 범위 모델, 고정 날짜 경계, 현재/이전 시즌 selector
- 현재 시즌 cache selector와 시즌 운동 스트릭
- 러닝/헬스 시즌 통계 selector
- Firestore 쓰기 없이 순수 단위 테스트부터 작성

완료 게이트: 과거 기록이 현재 추천/PR/직전 기록에 섞이지 않는 테스트 결과 확인.

### Slice 2 — 달력 페이드만 배포

- 달력 셀, 계획 레일, 지난 시즌 배지
- 기존 운동 탭 구조는 유지
- `STATIC_ASSETS` 변경과 함께 `sw.js` `CACHE_VERSION` 갱신

Dashboard3 UI 흐름:
`운동 → 시즌 경계 월 → 이전 시즌 날짜 → 상세 → 현재 시즌 날짜 복귀`.

완료 게이트: 실제 모바일 화면의 대비와 정보 밀도를 사용자에게 확인받는다.

### Slice 3 — 새 시즌 W1 재설정

- 새 시즌 마법사와 영향 미리보기
- 시즌별 Growth v2/러닝 계획 문서 생성 트랜잭션
- 기존 등록 종목 유지, W1 재시작, `w863-original-v1` 적용
- 중복 요청, 경계 겹침, 사진/원본 기록 불변 테스트

완료 게이트: Dashboard3 테스트 계정에서 저장 전후 스냅샷을 비교하고 승인받는다.

### Slice 4 — 웹 통계 스냅샷

- 위젯과 웹 통계가 함께 쓰는 순수 snapshot selector
- 러닝/헬스 달성률과 성장 표본 부족 상태
- Capacitor plugin 계약과 JS mock 테스트

완료 게이트: 고정 fixture의 JSON을 사용자에게 보여 숫자 정의를 확인받는다.

### Slice 5 — 대형 Android 위젯

- Kotlin snapshot store/plugin/provider, RemoteViews large/compact 레이아웃
- 기존 `StreakWidget`, `WeekWidget`, `MonthWidget`, `WidgetUtils`와 연결 리소스 제거
- 앱 저장/로그인/시즌 변경 직후 update broadcast
- 딥링크, empty/stale/loading, light/dark, resize 검증

완료 게이트: 실제 설치 APK에서 4×6과 4×4 스크린샷 및 터치 흐름 확인.

### Slice 6 — Dashboard3 최종 검증

- 전체 JS 테스트, native unit test, runtime asset 검사
- Android debug APK는 일반 터미널에서 빌드
- Dashboard3 `main` push 전 원격 lease 재확인
- Pages 커밋/캐시/정적 자산 검증
- 인증 계정으로 시즌 경계, W1 처방, 러닝/헬스 통계, 위젯 동기화 실행

## 9. 완료 조건

1. 시즌 전후 `workouts` 원본 문서 수와 사진/러닝 경로 참조가 동일하다.
2. 이전 시즌 기록은 열람·수정 가능하지만 현재 시즌 추천, PR, 직전 기록, 스트릭,
   볼륨/강도 목표에 들어오지 않는다.
3. 이전 시즌 달력과 계획 레일은 분명히 물러나 보이면서도 텍스트를 읽고 클릭할 수 있다.
4. 새 시즌의 모든 웬들러 종목이 `w863-original-v1`, W1로 시작하고 W7 회복 계약을
   유지한다.
5. 일반 운동의 볼륨/강도 목표와 러닝 주간 계획이 새 시즌 문서에서 시작한다.
6. 위젯은 시즌 스트릭, 러닝 계획/성장, 헬스 계획/성장을 한 화면에 표시한다.
7. 앱에서 기록을 저장하면 설치된 위젯이 즉시 갱신되고, 오래된 데이터는 오래된 상태를
   숨기지 않는다.
8. APK와 Manifest에 기존 3개 위젯 및 네이티브 Firestore REST/API key 경로가 남지 않는다.
9. Dashboard3 Pages가 기대 커밋을 반환하고, 실제 APK/모바일 UI 흐름까지 실행해야
   완료로 본다.

## 10. 배포 명령 원칙

현재 `deploy:dashboard3` 스크립트의 기본 remote는 `origin`이므로 그대로 실행하지 않는다.
구현 시에는 remote를 명시하도록 먼저 하드닝하거나 다음 환경값을 명시한다.

```powershell
$env:ALLOW_DASHBOARD3_DEPLOY='1'
$env:DASHBOARD3_REMOTE='dashboard3'
npm.cmd run deploy:dashboard3
```

비선형 이력 교체가 필요하면 이 스크립트보다 먼저 별도의 `git push --force-with-lease`
승인 단계와 예상 원격 SHA 검증을 둔다. 자동 배포 스크립트 안에서 무조건 강제 푸시하지
않는다.
