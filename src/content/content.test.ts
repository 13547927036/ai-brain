import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, QUALITY_DAMAGE_MUL, QUALITY_MIN_WAVE, SET_BONUS_PER_WEAPON } from './weapons.js';
import { WAVES, WAVE_COUNT, TOTAL_WAVE_SECONDS, waveAt } from './waves.js';
import { ENEMIES, ENEMY_BY_ID, scaleEnemy, WAVE12_MULTIPLIER } from './enemies.js';
import { CHARACTERS, CHARACTER_BY_ID, slotsAfterWave, MAX_WEAPON_SLOTS } from './characters.js';
import { MAIN_STAT_IDS, SUB_STAT_IDS, BASE_PLAYER, STAT_CAPS } from './stats.js';

test('8 把武器，4 近战 + 4 远程', () => {
  assert.equal(WEAPONS.length, 8);
  assert.equal(WEAPONS.filter((w) => w.kind === 'melee').length, 4);
  assert.equal(WEAPONS.filter((w) => w.kind === 'ranged').length, 4);
});

test('武器数值与 spec 4.3 表一致', () => {
  const byId = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
  assert.deepEqual(
    [byId.club?.damage, byId.club?.cooldown, byId.club?.range],
    [6, 0.8, 110],
  );
  assert.deepEqual(
    [byId.kunai?.damage, byId.kunai?.cooldown, byId.kunai?.range],
    [5, 0.9, 320],
  );
  assert.equal(byId.dualCannon?.shots, 2);
  assert.equal(byId.dualCannon?.spreadDeg, 24);
  assert.equal(byId.greatsword?.damage, 14);
  assert.equal(byId.broom?.cooldown, 0.35);
});

test('近战射程不得低于 90 —— 防止"贴脸打不到"的手感回归', () => {
  // 自动开火的索敌半径就是 def.range（firing.ts），射程过短会让角色
  // 站在敌人旁边不出手。曾经 club 只有 70，实际命中距离 70+14=84，
  // 在 750 宽的场地上不足 12%，实测手感是"贴脸才打"。
  const melee = WEAPONS.filter((w) => w.kind === 'melee');
  assert.ok(melee.length > 0);
  for (const w of melee) {
    assert.ok(w.range >= 90, `${w.name} 射程 ${w.range} 过短，会贴脸才出手`);
  }
});

test('起始武器射程够用 —— 开局不该贴脸', () => {
  const club = WEAPONS.find((w) => w.id === 'club');
  assert.ok(club, '起始武器 club 不存在');
  assert.ok(club.range >= 100, `起始武器射程 ${club.range} 偏短`);
});
test('品质倍率与出现波次与 spec 一致', () => {
  assert.deepEqual(QUALITY_DAMAGE_MUL, { 1: 1.0, 2: 1.35, 3: 1.8, 4: 2.4 });
  assert.deepEqual(QUALITY_MIN_WAVE, { 1: 1, 2: 2, 3: 4, 4: 7 });
  assert.equal(SET_BONUS_PER_WEAPON, 0.08);
});

test('12 波，总时长 269 秒（含商店约 5~6 分钟一局）', () => {
  assert.equal(WAVE_COUNT, 12);
  assert.equal(WAVES.length, 12);
  assert.equal(TOTAL_WAVE_SECONDS, 269);
});

test('波次时长与刷新率单调不降', () => {
  for (let i = 1; i < WAVES.length; i++) {
    const prev = WAVES[i - 1];
    const cur = WAVES[i];
    assert.ok(prev && cur);
    assert.ok(cur.duration >= prev.duration, `第 ${cur.index} 波时长倒退`);
    assert.ok(cur.spawnRate >= prev.spawnRate, `第 ${cur.index} 波刷新率倒退`);
    assert.ok(cur.enemyCount > prev.enemyCount, `第 ${cur.index} 波敌人数未增长`);
  }
});

test('只有第 12 波是 Boss 波', () => {
  assert.deepEqual(WAVES.filter((w) => w.boss).map((w) => w.index), [12]);
});

test('waveAt 夹取越界输入', () => {
  assert.equal(waveAt(1).index, 1);
  assert.equal(waveAt(12).index, 12);
  assert.equal(waveAt(0).index, 1);
  assert.equal(waveAt(999).index, 12);
});

test('4 个敌人，数值与 spec 4.4 一致', () => {
  assert.equal(ENEMIES.length, 4);
  const g = ENEMY_BY_ID.grunt!;
  const r = ENEMY_BY_ID.runner!;
  const s = ENEMY_BY_ID.shooter!;
  const b = ENEMY_BY_ID.boss!;
  assert.deepEqual([g.hp, g.speed, g.damage], [10, 60, 3]);
  assert.deepEqual([r.hp, r.speed, r.damage], [6, 100, 2]);
  assert.deepEqual([s.hp, s.speed, s.damage], [14, 45, 4]);
  assert.equal(s.keepDistance, 220);
  assert.equal(s.projectileSpeed, 180);
  assert.deepEqual([b.hp, b.speed, b.damage], [3000, 50, 6]);
  assert.equal(b.spawnMinionId, 'grunt');
});

test('敌人成长在第 12 波达到 2.98 / 2.10 / 1.22 倍', () => {
  assert.ok(Math.abs(WAVE12_MULTIPLIER.hp - 2.98) < 1e-9);
  assert.ok(Math.abs(WAVE12_MULTIPLIER.damage - 2.10) < 1e-9);
  assert.ok(Math.abs(WAVE12_MULTIPLIER.speed - 1.22) < 1e-9);
});

test('Boss 不参与波次成长', () => {
  const b = ENEMY_BY_ID.boss!;
  assert.deepEqual(scaleEnemy(b, 12), { hp: 3000, damage: 6, speed: 50 });
  assert.deepEqual(scaleEnemy(b, 1), { hp: 3000, damage: 6, speed: 50 });
});

test('小怪第 12 波生命按 +18%/波 成长', () => {
  const g = ENEMY_BY_ID.grunt!;
  assert.equal(scaleEnemy(g, 12).hp, Math.round(10 * 2.98));
  assert.equal(scaleEnemy(g, 1).hp, 10);
});

test('10 主属性 + 3 副属性', () => {
  assert.equal(MAIN_STAT_IDS.length, 10);
  assert.equal(SUB_STAT_IDS.length, 3);
});

test('玩家基础值与上限与 spec 一致', () => {
  assert.equal(BASE_PLAYER.maxHp, 60);
  assert.equal(BASE_PLAYER.baseSpeed, 180);
  assert.equal(BASE_PLAYER.critChance, 3);
  assert.equal(STAT_CAPS.armor, 30);
  assert.equal(STAT_CAPS.attacksPerSecond, 12);
});

test('3 个角色，规则与 spec 4.4 一致', () => {
  assert.equal(CHARACTERS.length, 3);
  const c = CHARACTER_BY_ID.chiikawa!;
  const h = CHARACTER_BY_ID.hachiware!;
  const u = CHARACTER_BY_ID.usagi!;
  assert.equal(c.hpMul, 0.75);
  assert.equal(c.luckMul, 1.5);
  assert.equal(h.materialXpMul, 1.25);
  assert.equal(u.attackSpeedMul, 1.4);
  assert.equal(u.armorLocked, true);
});

test('小八武器槽：初始 4，第 5 波后 5 格，第 9 波后 6 格', () => {
  const h = CHARACTER_BY_ID.hachiware!;
  assert.equal(slotsAfterWave(h, 1), 4);
  assert.equal(slotsAfterWave(h, 4), 4);
  assert.equal(slotsAfterWave(h, 5), 5);
  assert.equal(slotsAfterWave(h, 8), 5);
  assert.equal(slotsAfterWave(h, 9), 6);
  assert.equal(slotsAfterWave(h, 12), MAX_WEAPON_SLOTS);
});

test('其他角色一开始就有 6 格', () => {
  assert.equal(slotsAfterWave(CHARACTER_BY_ID.chiikawa!, 1), 6);
  assert.equal(slotsAfterWave(CHARACTER_BY_ID.usagi!, 1), 6);
});
