import test from 'node:test';
import assert from 'node:assert/strict';
import type { KeyValueStore } from '../platform/types.js';
import { beginWave, createRun, runWaveToCompletion } from './run.js';
import {
  clearRun, defaultMeta, loadMeta, loadRun, parseMeta, parseSnapshot,
  recordRunEnd, restoreRun, RUN_KEY, saveMeta, saveRun, SAVE_VERSION, snapshotRun,
} from './save.js';

function memStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    load: (k) => data.get(k) ?? null,
    save: (k, v) => void data.set(k, v),
    remove: (k) => void data.delete(k),
  };
}

test('快照往返：属性、武器、材料都能还原', () => {
  const run = createRun({ characterId: 'chiikawa', seed: 42 });
  beginWave(run, 1);
  const p = run.world.player;
  p.hp = 33;
  p.maxHp = 80;
  p.level = 4;
  p.xp = 7;
  p.materials = 25;
  p.weaponSlots = 5;
  p.stats.meleeDamage = 12;
  p.pendingLevelUps = 1;
  p.weapons.push({ defId: 'kunai', quality: 2, cooldown: 0 });

  const snap = snapshotRun(run, 0);
  const restored = restoreRun(snap);
  const q = restored.world.player;

  assert.equal(q.hp, 33);
  assert.equal(q.maxHp, 80);
  assert.equal(q.level, 4);
  assert.equal(q.xp, 7);
  assert.equal(q.materials, 25);
  assert.equal(q.weaponSlots, 5);
  assert.equal(q.stats.meleeDamage, 12);
  assert.equal(q.pendingLevelUps, 1);
  assert.equal(q.weapons.length, 2);
  assert.equal(q.weapons[1]?.defId, 'kunai');
  assert.equal(q.weapons[1]?.quality, 2);
});

test('恢复后停在商店阶段，波次正确', () => {
  const run = createRun({ characterId: 'hachiware', seed: 9 });
  beginWave(run, 3);
  run.world.wave.index = 3;
  run.world.wave.active = false; // 波末存档：本波已完成
  const snap = snapshotRun(run, 0);
  const restored = restoreRun(snap);
  assert.equal(restored.phase, 'shop');
  assert.equal(restored.world.wave.index, 3);
  assert.ok(restored.shop);
  assert.equal(restored.shop?.wave, 4, '商店应面向下一波');
});

test('第 12 波后恢复直接判通关', () => {
  const run = createRun({ characterId: 'usagi', seed: 1 });
  run.world.wave.index = 12;
  const snap = snapshotRun(run, 0);
  const restored = restoreRun(snap);
  assert.equal(restored.phase, 'victory');
  assert.equal(restored.world.victory, true);
});

test('生命值被夹在合法区间', () => {
  const run = createRun({ characterId: 'chiikawa', seed: 2 });
  const snap = snapshotRun(run, 0);
  snap.player.maxHp = 60;
  snap.player.hp = 9999;
  assert.equal(restoreRun(snap).world.player.hp, 60, '超过上限应被夹到 maxHp');

  snap.player.hp = -5;
  assert.equal(restoreRun(snap).world.player.hp, 1, '生命不应为 0 或负');
});

test('武器数量不超过槽位上限', () => {
  const run = createRun({ characterId: 'chiikawa', seed: 3 });
  run.world.player.weaponSlots = 2;
  const snap = snapshotRun(run, 0);
  for (let i = 0; i < 10; i++) snap.player.weapons.push({ defId: 'club', quality: 1 });
  assert.equal(restoreRun(snap).world.player.weapons.length, 2);
});

test('损坏的 JSON 返回 null 而不是抛异常', () => {
  assert.equal(parseSnapshot(null), null);
  assert.equal(parseSnapshot(''), null);
  assert.equal(parseSnapshot('{'), null);
  assert.equal(parseSnapshot('null'), null);
  assert.equal(parseSnapshot('[]'), null);
  assert.equal(parseSnapshot('{"version":1}'), null);
});

test('版本不匹配视为无效存档', () => {
  const run = createRun({ characterId: 'hachiware', seed: 4 });
  const raw = JSON.stringify({ ...snapshotRun(run, 0), version: SAVE_VERSION + 1 });
  assert.equal(parseSnapshot(raw), null);
});

test('字段类型不对视为无效存档', () => {
  const run = createRun({ characterId: 'hachiware', seed: 4 });
  const good = snapshotRun(run, 0);
  const cases: unknown[] = [
    { ...good, waveIndex: 0 },
    { ...good, waveIndex: 13 },
    { ...good, waveIndex: 1.5 },
    { ...good, player: null },
    { ...good, player: { ...good.player, hp: 'x' } },
    { ...good, player: { ...good.player, maxHp: 0 } },
    { ...good, player: { ...good.player, weapons: 'x' } },
    { ...good, characterId: '' },
  ];
  for (const c of cases) {
    assert.equal(parseSnapshot(JSON.stringify(c)), null, `应拒绝: ${JSON.stringify(c).slice(0, 60)}`);
  }
});

test('存取与清除', () => {
  const store = memStore();
  assert.equal(loadRun(store), null);
  const run = createRun({ characterId: 'chiikawa', seed: 5 });
  beginWave(run, 2);
  run.world.wave.active = false; // 波末存档
  saveRun(store, run, 0);
  assert.ok(store.data.has(RUN_KEY));
  const loaded = loadRun(store);
  assert.ok(loaded);
  assert.equal(loaded?.waveIndex, 2);
  clearRun(store);
  assert.equal(loadRun(store), null);
});

test('局外记录：默认值、存取、累加', () => {
  const store = memStore();
  assert.deepEqual(loadMeta(store), defaultMeta());

  const m1 = recordRunEnd(store, 6, false, 40);
  assert.equal(m1.bestWave, 6);
  assert.equal(m1.runsPlayed, 1);
  assert.equal(m1.victories, 0);
  assert.equal(m1.totalKills, 40);

  const m2 = recordRunEnd(store, 12, true, 100);
  assert.equal(m2.bestWave, 12);
  assert.equal(m2.runsPlayed, 2);
  assert.equal(m2.victories, 1);
  assert.equal(m2.totalKills, 140);

  const m3 = recordRunEnd(store, 3, false, 10);
  assert.equal(m3.bestWave, 12, '最佳记录不应被更差的成绩覆盖');
});

test('局外记录损坏时回落到默认值', () => {
  assert.deepEqual(parseMeta('{'), defaultMeta());
  assert.deepEqual(parseMeta('{"version":99}'), defaultMeta());
  assert.deepEqual(parseMeta(null), defaultMeta());
});

test('静音设置能持久化', () => {
  const store = memStore();
  const meta = loadMeta(store);
  meta.muted = true;
  saveMeta(store, meta);
  assert.equal(loadMeta(store).muted, true);
});

test('存储抛错时不影响游戏（隐私模式）', () => {
  const broken: KeyValueStore = {
    load: () => { throw new Error('denied'); },
    save: () => { throw new Error('denied'); },
    remove: () => { throw new Error('denied'); },
  };
  const run = createRun({ characterId: 'chiikawa', seed: 6 });
  assert.doesNotThrow(() => saveRun(broken, run, 0));
  assert.equal(loadRun(broken), null);
  assert.doesNotThrow(() => clearRun(broken));
  assert.doesNotThrow(() => saveMeta(broken, defaultMeta()));
  assert.deepEqual(loadMeta(broken), defaultMeta());
});

test('打完一整波后存档，恢复能继续打', () => {
  const run = createRun({ characterId: 'hachiware', seed: 77 });
  beginWave(run, 1);
  runWaveToCompletion(run);
  const store = memStore();
  saveRun(store, run, 0);
  const snapshot = loadRun(store);
  assert.ok(snapshot);
  const restored = restoreRun(snapshot);
  assert.equal(restored.world.wave.index, 1);
  assert.equal(restored.phase, run.phase === 'levelUp' ? 'shop' : run.phase);
  const frames = runWaveToCompletion({ ...restored, phase: 'battle' } as typeof restored, 10);
  assert.ok(frames >= 0);
});

test('战斗中存档：恢复后回到上一波完成的商店（本波需重打）', () => {
  const run = createRun({ characterId: 'hachiware', seed: 31 });
  beginWave(run, 4);
  assert.equal(run.world.wave.active, true, '战斗中');
  const snap = snapshotRun(run, 0);
  assert.equal(snap.waveIndex, 3, '第 4 波未完成，应记为只完成到第 3 波');
  const restored = restoreRun(snap);
  assert.equal(restored.phase, 'shop');
  assert.equal(restored.shop?.wave, 4, '续玩时第 4 波重新开始');
});

test('第 1 波中途存档不写入（没有可续的进度）', () => {
  const store = memStore();
  const run = createRun({ characterId: 'chiikawa', seed: 32 });
  beginWave(run, 1);
  saveRun(store, run, 0);
  assert.equal(loadRun(store), null, '第 1 波没打完不应产生存档');
});