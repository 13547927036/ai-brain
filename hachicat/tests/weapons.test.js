import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { spawnEnemy } from '../src/game/systems/enemies.js';
import { ALL_ENEMIES, scaleEnemy } from '../src/content/enemies.js';

/** 建一局，只留一件武器，并在身前放一只扫地机。 */
function setup(weaponId, distance = 60) {
  const game = new Game({ seed: 12345 });
  game.setViewport(390, 844);
  game.startRun('hachiware');
  const world = game.world;
  world.player.weapons = [{ id: weaponId, level: 1, cd: 0 }];
  world.enemies.length = 0;
  const def = scaleEnemy(ALL_ENEMIES.sweeper, 1, false);
  const enemy = spawnEnemy(world, def, world.player.x + distance, world.player.y, world.rng);
  return { game, world, enemy };
}

function tick(game, frames) {
  for (let i = 0; i < frames; i += 1) game.update(1 / 60);
}

test('毛球弹：发射飞行物并命中', () => {
  const { game, world, enemy } = setup('hairball');
  tick(game, 1);
  assert.ok(world.bullets.length > 0, '应当生成子弹');
  tick(game, 30);
  assert.ok(enemy.dead || enemy.hp < enemy.maxHp, '子弹应当命中扣血');
});

test('磨爪：近战立即命中，不产生子弹', () => {
  const { game, world, enemy } = setup('claw', 70);
  tick(game, 2);
  assert.ok(enemy.hp < enemy.maxHp, '近战应当扣血');
  assert.equal(world.bullets.length, 0, '近战不应生成子弹');
});

test('哈气：锥形扣血并施加减速', () => {
  const { game, enemy } = setup('hiss', 90);
  tick(game, 2);
  assert.ok(enemy.hp < enemy.maxHp, '哈气应当扣血');
  assert.ok(enemy.slowT > 0 && enemy.slow > 0, '哈气应当施加减速');
});

test('激光笔：贯穿射线扣血，不产生子弹', () => {
  const { game, world, enemy } = setup('laser', 180);
  tick(game, 2);
  assert.ok(enemy.hp < enemy.maxHp, '射线应当扣血');
  assert.equal(world.bullets.length, 0, '射线不应生成子弹');
});

test('尾巴旋风：环绕持续伤害', () => {
  const { game, world, enemy } = setup('tail', 60);
  tick(game, 2);
  assert.ok(enemy.hp < enemy.maxHp, '环绕应当扣血');
  assert.equal(world.bullets.length, 0, '环绕不应生成子弹');
});

test('捕鼠夹：布置陷阱，不直接开火', () => {
  const { game, world } = setup('trap', 100);
  tick(game, 2);
  assert.ok(world.traps.length >= 1, '应当放下陷阱');
  assert.equal(world.bullets.length, 0, '陷阱不应生成子弹');
});