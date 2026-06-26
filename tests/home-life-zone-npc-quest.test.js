import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readPngHeader(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25)
  };
}

test('life zone NPC quest bubble is rendered as a clickable future modal hook', () => {
  const source = readText('home/life-zone.js');

  assert.match(source, /LIFE_ZONE_UI_ROOT/);
  assert.match(source, /npc-quest-bubble\.png/);
  assert.match(source, /data-lz-action="npc-quest"/);
  assert.match(source, /aria-label="NPC 퀘스트 보기"/);
  assert.match(source, /addEventListener\('click'/);
  assert.match(source, /life-zone:npc-quest/);
  assert.match(source, /detail: \{ npc: 'trainer' \}/);
});

test('life zone NPC quest bubble has a stable clickable overlay style', () => {
  const css = readText('style.css');

  assert.match(css, /\.lz-npc-quest \{/);
  assert.match(css, /left: calc\(1058 \/ 1672 \* 100%\)/);
  assert.match(css, /top: calc\(932 \/ 1672 \* 100%\)/);
  assert.match(css, /pointer-events: auto/);
  assert.match(css, /touch-action: manipulation/);
  assert.match(css, /\.lz-npc-quest:focus-visible/);
});

test('life zone NPC quest bubble is a tracked transparent PNG runtime asset', () => {
  const sw = readText('sw.js');
  const header = readPngHeader('assets/home/life-zone/ui/npc-quest-bubble.png');

  assert.match(sw, /tomatofarm-v20260626z11-cycle-settings-polish/);
  assert.match(sw, /\.\/assets\/home\/life-zone\/ui\/npc-quest-bubble\.png/);
  assert.deepEqual(header, {
    width: 192,
    height: 258,
    colorType: 6
  });
});
