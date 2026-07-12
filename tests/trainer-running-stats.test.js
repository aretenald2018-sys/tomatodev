import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const runningStatsJs = readFileSync('modals/trainer-running-stats.js', 'utf8');
const trainerModalJs = readFileSync('modals/trainer-quest-modal.js', 'utf8');

test('trainer running stats provides a separate recent-activity and Nike-style run-detail flow', () => {
  assert.match(trainerModalJs, /data-trainer-quest-action="running-stats"/);
  assert.match(trainerModalJs, /data-trainer-running-stats-root/);
  assert.match(trainerModalJs, /import\('\.\/trainer-running-stats\.js'\)/);
  assert.match(runningStatsJs, /import \{ getCache \} from '\.\.\/data\.js'/);
  assert.match(runningStatsJs, /listRunningActivities\(Object\.entries\(getCache\(\) \|\| \{\}\)\)/);
  assert.match(runningStatsJs, /최근 활동/);
  assert.match(runningStatsJs, /상세 정보/);
  assert.match(runningStatsJs, /trainer-running-activity-card/);
  assert.match(runningStatsJs, /trainer-running-route-preview/);
  assert.match(runningStatsJs, /거리/);
  assert.match(runningStatsJs, /평균 페이스/);
  assert.match(runningStatsJs, /최고 페이스/);
  assert.match(runningStatsJs, /활성 시간/);
  assert.match(runningStatsJs, /경과 시간/);
  assert.match(runningStatsJs, /칼로리\(근사치\)/);
  assert.match(runningStatsJs, /평균 케이던스/);
  assert.match(runningStatsJs, /고도 상승/);
  assert.match(runningStatsJs, /고도 하강/);
  assert.match(runningStatsJs, /평균 심박수/);
  assert.match(runningStatsJs, /최대 심박수/);
  assert.match(runningStatsJs, /trainer-running-split-table/);
  assert.match(runningStatsJs, /평균 페이스<\/span><span role="columnheader">\+\/-<\/span>/);
  assert.match(runningStatsJs, /trainer-running-split-delta/);
  assert.match(runningStatsJs, /addEventListener\('click'/);
  assert.doesNotMatch(runningStatsJs, /onclick=/);
});
