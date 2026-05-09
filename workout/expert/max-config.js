// ================================================================
// workout/expert/max-config.js — 테스트모드 라벨/기본값
// ================================================================

export const CAT_LABEL = {
  barbell: '바벨',
  dumbbell: '덤벨',
  smith: '스미스',
  machine: '머신',
  cable: '케이블',
  bodyweight: '맨몸',
};

export const MAX_DEFAULTS = {
  goal: 'hypertrophy',
  daysPerWeek: 6,
  sessionMinutes: 90,
  preferredRpe: '8-9',
};

export const MAX_FRAMEWORKS = {
  dual_track_progression_v2: {
    label: '6주 듀얼 트랙',
    short: '6주',
    copy: '부위별 벤치마크를 볼륨/강도 트랙으로 나눠 6주 뒤 목표 중량까지 선형 진행합니다.',
  },
  adaptive_volume: {
    label: 'Adaptive Volume',
    short: 'Adaptive',
    copy: '최근 기록과 이번 주 세트 간극으로 오늘 처방을 조정합니다.',
  },
  rp_lite: {
    label: 'RP Lite',
    short: 'RP',
    copy: '부위별 세트 목표를 MEV에서 MAV 쪽으로 천천히 올립니다.',
  },
  wendler531: {
    label: '5/3/1',
    short: '5/3/1',
    copy: '메인 리프트는 Training Max 기준 주차별 강도로 진행합니다.',
  },
  hybrid: {
    label: 'Hybrid',
    short: 'Hybrid',
    copy: '메인 리프트는 5/3/1, 보조 종목은 볼륨 간극으로 추천합니다.',
  },
};

export const MAX_MAIN_LIFTS = {
  barbell_bench: 'bench',
  back_squat: 'squat',
  deadlift: 'deadlift',
  ohp: 'ohp',
};

export const MAX_DEFAULT_TARGET_SETS = {
  chest: 12,
  back: 14,
  lower: 12,
  shoulder: 10,
  glute: 8,
  bicep: 8,
  tricep: 8,
  abs: 8,
};

export const WEAK_PARTS = [
  { id: 'chest_all', label: '가슴 전체', coach: '가슴 전반' },
  { id: 'chest_upper', label: '가슴 상부', coach: '상부 볼륨' },
  { id: 'chest_mid', label: '가슴 중부', coach: '중부 기준' },
  { id: 'chest_lower', label: '가슴 하부', coach: '하부 라인' },
  { id: 'back_all', label: '등 전체', coach: '등 전반' },
  { id: 'back_width', label: '등 넓이', coach: '광배/풀다운' },
  { id: 'back_thickness', label: '등 두께', coach: '로우/수축' },
  { id: 'shoulder_front', label: '어깨 전면', coach: '프레스 전면' },
  { id: 'shoulder_side', label: '어깨 측면', coach: '측면 볼륨' },
  { id: 'rear_delt', label: '어깨 후면', coach: '후면 안정' },
  { id: 'bicep', label: '이두', coach: '컬 볼륨' },
  { id: 'tricep', label: '삼두', coach: '프레스 보조' },
  { id: 'core', label: '복근/코어', coach: '중량 코어' },
  { id: 'quad', label: '대퇴사두', coach: '스쿼트/익스텐션' },
  { id: 'hamstring', label: '대퇴이두', coach: '컬/힌지 보강' },
  { id: 'glute', label: '둔근', coach: '힙 파워' },
  { id: 'calf', label: '종아리', coach: '하퇴 볼륨' },
];

export const WEAK_LABEL = Object.fromEntries(WEAK_PARTS.map(p => [p.id, p.label]));

export const MAJOR_PARTS = [
  { id: 'chest', label: '가슴', coach: '프레스/플라이' },
  { id: 'back', label: '등', coach: '넓이/두께' },
  { id: 'lower', label: '하체', coach: '스쿼트/프레스' },
  { id: 'shoulder', label: '어깨', coach: '프레스/측면' },
  { id: 'glute', label: '둔부', coach: '힙힌지/킥백' },
  { id: 'bicep', label: '이두', coach: '컬 볼륨' },
  { id: 'tricep', label: '삼두', coach: '푸쉬다운/프레스' },
  { id: 'abs', label: '복근', coach: '중량 코어' },
];

export const MAJOR_LABEL = Object.fromEntries(MAJOR_PARTS.map(p => [p.id, p.label]));

export const SAME_DAY_DETAIL_PARTS = {
  chest: ['chest_upper', 'chest_mid', 'chest_lower'],
  back: ['back_width', 'back_thickness', 'posterior'],
  lower: ['quad', 'hamstring', 'glute', 'calf'],
  shoulder: ['shoulder_front', 'shoulder_side', 'rear_delt'],
};

export const SAME_DAY_DETAIL_LABEL = {
  posterior: '후면사슬',
  calf: '종아리',
};
