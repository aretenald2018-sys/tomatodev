import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractFunctionSource } from './helpers/source-function.js';

const calendarJs = readFileSync(new URL('../render-calendar.js', import.meta.url), 'utf8');
const calendarExportTextJs = readFileSync(new URL('../calendar/export-text.js', import.meta.url), 'utf8');
const calendarSources = [calendarJs, calendarExportTextJs];

// 추출 텍스트 조립은 render-calendar의 데이터 계층에 묶여 있지 않은 순수 로직이다.
// 원본 소스를 그대로 떼어와 스텁 위에서 실행한다.
function buildExportApi({ dayBlocks = {} } = {}) {
  const factory = new Function('stubs', `
    const { dayBlocks } = stubs;
    function _parseDateKey(key) {
      const match = String(key || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
      if (!match) return null;
      return { y: +match[1], m: +match[2] - 1, d: +match[3] };
    }
    function _dateTitle(key) { return key; }
    function _shiftDateKey(key, days) {
      const [y, m, d] = key.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + days);
      const pad = n => String(n).padStart(2, '0');
      return \`\${dt.getFullYear()}-\${pad(dt.getMonth() + 1)}-\${pad(dt.getDate())}\`;
    }
    function _buildWorkoutLookup() { return {}; }
    function _sortedCheckins() { return []; }
    function getDietPlan() { return null; }
    function _workoutDayExportBlocks(key) { return dayBlocks[key] || []; }

    ${extractFunctionSource(calendarSources, '_weekKeysFor')}
    ${extractFunctionSource(calendarSources, '_buildWorkoutRecordsExport')}

    return { _weekKeysFor, _buildWorkoutRecordsExport };
  `);
  return factory({ dayBlocks });
}

test('week export spans Monday through Sunday of the selected date', () => {
  const { _weekKeysFor } = buildExportApi();
  // 2026-07-21은 화요일이다.
  assert.deepEqual(_weekKeysFor('2026-07-21'), [
    '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23',
    '2026-07-24', '2026-07-25', '2026-07-26',
  ]);
  // 일요일은 직전 월요일이 시작이어야 한다.
  assert.equal(_weekKeysFor('2026-07-26')[0], '2026-07-20');
  // 월요일은 자기 자신이 시작이다.
  assert.equal(_weekKeysFor('2026-07-20')[0], '2026-07-20');
  // 월 경계를 넘어가도 7일을 유지한다.
  assert.equal(_weekKeysFor('2026-08-01').length, 7);
  assert.equal(_weekKeysFor('2026-08-01')[0], '2026-07-27');
  assert.deepEqual(_weekKeysFor('not-a-date'), []);
});

test('day export copies only the selected date and skips empty sessions', () => {
  const { _buildWorkoutRecordsExport } = buildExportApi({
    dayBlocks: {
      '2026-07-21': ['[1회차]\n운동시간: 70분', '[러닝]\n운동시간: 30분'],
      '2026-07-22': ['[1회차]\n운동시간: 40분'],
    },
  });

  const day = _buildWorkoutRecordsExport('2026-07-21', 'day');
  assert.equal(day.title, '2026-07-21 운동 기록');
  assert.match(day.text, /^2026-07-21 운동 기록\n\n■ 2026-07-21\n\n\[1회차\]/);
  assert.match(day.text, /\[러닝\]/);
  assert.doesNotMatch(day.text, /2026-07-22/);
});

test('week export joins every recorded day under one heading', () => {
  const { _buildWorkoutRecordsExport } = buildExportApi({
    dayBlocks: {
      '2026-07-20': ['[1회차]\n운동시간: 50분'],
      '2026-07-22': ['[2회차]\n운동시간: 60분'],
    },
  });

  const week = _buildWorkoutRecordsExport('2026-07-21', 'week');
  assert.equal(week.title, '2026-07-20 ~ 2026-07-26 운동 기록');
  assert.match(week.text, /■ 2026-07-20[\s\S]*■ 2026-07-22/);
  // 기록이 없는 날은 헤더도 남기지 않는다.
  assert.doesNotMatch(week.text, /■ 2026-07-21/);
  assert.doesNotMatch(week.text, /■ 2026-07-23/);
});

test('export returns nothing when the range has no records', () => {
  const { _buildWorkoutRecordsExport } = buildExportApi({ dayBlocks: {} });
  assert.equal(_buildWorkoutRecordsExport('2026-07-21', 'day'), null);
  assert.equal(_buildWorkoutRecordsExport('2026-07-21', 'week'), null);
});

test('export writes to the clipboard rather than the share sheet', () => {
  const exportFn = extractFunctionSource(calendarSources, '_exportWorkoutRecords');
  const copyFn = extractFunctionSource(calendarSources, '_copyTextToClipboard');
  assert.match(exportFn, /_copyTextToClipboard\(payload\.text\)/);
  assert.doesNotMatch(exportFn, /navigator\.share|_shareOrCopyText/);
  assert.match(copyFn, /clipboard\?\.writeText/);
  assert.match(copyFn, /document\.execCommand\('copy'\)/);
});

// 운동 화면은 세트에 rpe를, 달력 상세 시트는 rir을 남긴다. 내보내기가 rpe만 읽던
// 동안에는 같은 주 기록인데도 시트에서 적은 세트만 강도가 통째로 빠져나갔다.
test('every exported set carries RIR and RPE no matter which screen recorded it', async () => {
  const { _formatSetText } = await import('../calendar/format.js');
  // export-text.js는 data.js를 통해 원격 Firebase 모듈까지 끌고 온다.
  // 조립 로직만 소스에서 떼어와 스텁 위에서 돌린다.
  const buildExportText = new Function(`
    function _dateTitle(key) { return key; }
    function _formatDuration(sec) { return \`\${Math.round(sec / 60)}분\`; }
    function _sessionLabel(index) { return \`\${Number(index) + 1}회차\`; }
    function formatWorkoutTrackValue() { return ''; }
    function _cardioSummaryText() { return ''; }
    ${extractFunctionSource([calendarExportTextJs], '_formatWorkoutExportText')}
    return _formatWorkoutExportText;
  `)();

  // 운동 화면 기록: rpe만 있다.
  assert.equal(_formatSetText({ kg: 60, reps: 8, rpe: 8 }), '60kg x 8회 · RIR 2 · RPE 8');
  // 달력 상세 시트 기록: rir만 있다.
  assert.equal(_formatSetText({ kg: 60, reps: 8, rir: 2 }), '60kg x 8회 · RIR 2 · RPE 8');
  // 둘 다 있으면 저장된 값을 그대로 쓴다.
  assert.equal(_formatSetText({ kg: 50, reps: 10, rir: 1, rpe: 9 }), '50kg x 10회 · RIR 1 · RPE 9');
  // 소수 RIR도 잃지 않는다.
  assert.equal(_formatSetText({ kg: 40, reps: 12, rir: 1.5 }), '40kg x 12회 · RIR 1.5 · RPE 8.5');
  // 강도를 안 적은 세트에 값을 지어내지는 않는다.
  assert.equal(_formatSetText({ kg: 40, reps: 12 }), '40kg x 12회');
  assert.equal(_formatSetText({ kg: 40, reps: 12, rpe: 0 }), '40kg x 12회');

  const text = buildExportText('2026-07-21', 0, { memo: '' }, {
    durationSec: 3600,
    setCount: 2,
    volume: 0,
    burned: { total: 0 },
    exercises: [
      { name: '벤치프레스', setTexts: [_formatSetText({ kg: 60, reps: 8, rpe: 8 })] },
      { name: '스쿼트', setTexts: [_formatSetText({ kg: 100, reps: 5, rir: 3 })] },
    ],
    activities: [],
  });
  // 한 기록 안에서 두 화면의 세트가 같은 형식으로 나란히 나와야 한다.
  assert.match(text, /벤치프레스\n- 1세트: 60kg x 8회 · RIR 2 · RPE 8/);
  assert.match(text, /스쿼트\n- 1세트: 100kg x 5회 · RIR 3 · RPE 7/);
});
