# TomatoDev

신규 기능을 먼저 개발·검증하는 개발용 GitHub Pages 저장소입니다. 준비된 기능은 사용자가 판단했을 때 운영 저장소(Tomato Farm)로 승격합니다. 소스·Git 이력·Pages 산출물은 운영과 별도이며, 현재 Firebase와 브라우저 origin은 운영 앱과 공유합니다.

따라서 이 저장소의 배포는 운영 Git/Pages를 건드리지 않지만 데이터 백엔드까지 격리된 스테이징 환경은 아닙니다. 웹 FCM과 APK 배포는 비활성화되어 있으며, 자세한 제한은 [환경 경계 문서](docs/reference/ENVIRONMENT_BOUNDARIES.md)에 기록합니다.

## 시작하기

프로젝트 루트에서 실행합니다. 로컬 경로는 문서에 고정하지 않습니다.

```powershell
npm.cmd ci
npm.cmd run check:repository
npm.cmd test
npm.cmd run dev
```

`npm.cmd run dev`가 출력한 로컬 URL을 사용합니다. `www/`는 생성물이므로 직접 수정하지 않습니다.

## 주요 명령

```powershell
npm.cmd test                 # 거버넌스, 문법, 전체 node:test
npm.cmd run test:contracts  # 빠른 구조 계약
npm.cmd run verify:assets   # 생성 CSS와 런타임 자산의 무변경 검증
npm.cmd run build           # style.css, cache/build info, www 생성
npm.cmd --prefix functions test
npm.cmd run deploy:dev      # canonical main에서 TomatoDev Pages만 배포
```

Android/Wear 검증이 필요한 변경은 다음을 추가로 실행합니다.

```powershell
npx.cmd cap sync android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
.\android\gradlew.bat -p android :app:testDebugUnitTest :wear:testDebugUnitTest :app:assembleDebug :wear:assembleDebug
```

## 구조와 규칙

- 코드·데이터·이벤트 소유권: [ARCHITECTURE.md](ARCHITECTURE.md)
- UI/CSS 소유권: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- 호환 레이어: [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)
- 생활존 아트: [docs/LIFE_ZONE_ASSETS.md](docs/LIFE_ZONE_ASSETS.md)
- 개발/운영 환경 경계: [docs/reference/ENVIRONMENT_BOUNDARIES.md](docs/reference/ENVIRONMENT_BOUNDARIES.md)
- 작업·검증·릴리스 규칙: [AGENTS.md](AGENTS.md)

Development URL: `https://aretenald2018-sys.github.io/tomatodev/`
