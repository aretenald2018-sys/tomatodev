// ================================================================
// config.js
// 의존성: 없음
// 비공개 API 키는 코드에 저장하지 않음 — 앱 설정 화면에서 입력 후 localStorage 저장
// ================================================================

const PUBLIC_VWORLD_MAP_KEY = '0E32F4A9-EA52-3F07-9A67-AE92A8384CE6';

export const TOMATODEV_LOCAL_SETTING_KEYS = Object.freeze({
  RUNNING_MAP_PROVIDER: 'tomatodev_cfg_running_map_provider',
  VWORLD_API_KEY: 'tomatodev_cfg_vworld_api_key',
  VWORLD_MAP_LAYER: 'tomatodev_cfg_vworld_map_layer',
  GOOGLE_MAPS_KEY: 'tomatodev_cfg_google_maps_key',
  TMAP_APP_KEY: 'tomatodev_cfg_tmap_app_key',
});

function _readLocalSetting(key) {
  try {
    return typeof localStorage !== 'undefined' ? (localStorage.getItem(key) || '') : '';
  } catch {
    return '';
  }
}

export const CONFIG = {
  MAPS: {
    get RUNNING_PROVIDER()  { return _readLocalSetting(TOMATODEV_LOCAL_SETTING_KEYS.RUNNING_MAP_PROVIDER) || 'auto'; },
    get VWORLD_API_KEY()    { return _readLocalSetting(TOMATODEV_LOCAL_SETTING_KEYS.VWORLD_API_KEY) || PUBLIC_VWORLD_MAP_KEY; },
    get VWORLD_MAP_LAYER()  { return _readLocalSetting(TOMATODEV_LOCAL_SETTING_KEYS.VWORLD_MAP_LAYER) || 'base'; },
    get GOOGLE_MAPS_KEY()   { return _readLocalSetting(TOMATODEV_LOCAL_SETTING_KEYS.GOOGLE_MAPS_KEY); },
    get TMAP_APP_KEY()      { return _readLocalSetting(TOMATODEV_LOCAL_SETTING_KEYS.TMAP_APP_KEY); },
  },
  // TomatoDev는 운영 Firebase callable을 차단하므로 Groq 클라이언트 설정을 두지 않는다.
  APPCHECK_SITE_KEY: '6LfUKrYsAAAAAOhty9w6l1xUVaiGDmltI0obPVRM',

  // 식품의약품안전처 식품영양성분 DB (data.go.kr 일반인증키) — 자연식품+가공식품 모두 포함
  FOOD_DB_KEY: 'e54c5a3ae4ee20df7abd68a1b14528ad309c2fbe25a9ab1128bf7e410414d59b',
  FOOD_DB_URL: 'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02',

  FIREBASE: {
    apiKey:            "AIzaSyCk2czvJ8DRautrUput8TLjdrArpQm7BBk",
    authDomain:        "exercise-management.firebaseapp.com",
    projectId:         "exercise-management",
    storageBucket:     "exercise-management.firebasestorage.app",
    messagingSenderId: "867781711662",
    appId:             "1:867781711662:web:8fe1e9904c94d021f2ccbf",
  },

  DEFAULT_EXERCISES: [
    { muscleId:'chest',    id:'chest_1',    name:'바벨 벤치프레스',              movementId:'barbell_bench' },
    { muscleId:'chest',    id:'chest_2',    name:'덤벨 벤치프레스',              movementId:'dumbbell_bench' },
    { muscleId:'chest',    id:'chest_3',    name:'인클라인 스미스 벤치프레스',   movementId:'incline_smith_bench' },
    { muscleId:'chest',    id:'chest_4',    name:'인클라인 덤벨 벤치프레스',     movementId:'incline_dumbbell_bench' },
    { muscleId:'chest',    id:'chest_5',    name:'플라이',                       movementId:'chest_fly' },
    { muscleId:'chest',    id:'chest_6',    name:'디클라인 머신',                movementId:'decline_machine_press' },
    { muscleId:'back',     id:'back_1',     name:'랫풀다운',                     movementId:'lat_pulldown' },
    { muscleId:'back',     id:'back_2',     name:'암풀다운',                     movementId:'arm_pulldown' },
    { muscleId:'back',     id:'back_3',     name:'하이로우',                     movementId:'high_row' },
    { muscleId:'back',     id:'back_4',     name:'티바로우',                     movementId:'t_bar_row' },
    { muscleId:'lower',    id:'lower_1',    name:'스쿼트',                       movementId:'back_squat' },
    { muscleId:'lower',    id:'lower_2',    name:'누워서 스쿼트',                movementId:'leg_press' },
    { muscleId:'lower',    id:'lower_3',    name:'스쿼트 머신',                  movementId:'squat_machine' },
    { muscleId:'lower',    id:'lower_4',    name:'레그익스텐션',                 movementId:'leg_extension' },
    { muscleId:'lower',    id:'lower_5',    name:'핵스쿼트',                     movementId:'hack_squat' },
    { muscleId:'shoulder', id:'shoulder_1', name:'사레레',                       movementId:'lateral_raise' },
    { muscleId:'shoulder', id:'shoulder_2', name:'전면',                         movementId:'front_raise' },
    { muscleId:'shoulder', id:'shoulder_3', name:'후면',                         movementId:'rear_delt_fly' },
    { muscleId:'shoulder', id:'shoulder_4', name:'케이블',                       movementId:'cable_lateral_raise' },
    { muscleId:'bicep',    id:'bicep_1',    name:'케이블',                       movementId:'cable_curl' },
    { muscleId:'tricep',   id:'tricep_1',   name:'케이블',                       movementId:'cable_tricep_pushdown' },
    { muscleId:'abs',      id:'abs_1',      name:'플랭크',                       movementId:'plank' },
    { muscleId:'abs',      id:'abs_2',      name:'행잉 레그 레이즈',             movementId:'hanging_leg_raise' },
    { muscleId:'abs',      id:'abs_3',      name:'케이블 크런치',                movementId:'cable_crunch' },
    { muscleId:'glute',    id:'glute_1',    name:'힙 쓰러스트',                  movementId:'hip_thrust' },
    { muscleId:'glute',    id:'glute_2',    name:'글루트 브릿지',                movementId:'glute_bridge' },
    { muscleId:'glute',    id:'glute_3',    name:'케이블 킥백',                  movementId:'cable_kickback' },
  ],
};

export {
  MOVEMENTS,
  MOVEMENT_MUSCLES_MAP,
  BROAD_EQUIPMENT_MUSCLES_MAP,
  MOVEMENT_PATTERNS,
  MAX_PREFERRED_CATEGORIES,
  MUSCLES,
} from './config/movements.js';
export { KOREAN_WEEKDAYS as DAYS } from './utils/weekdays.js';
