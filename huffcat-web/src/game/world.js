import { ARENA, PLAYER_RADIUS } from './constants.js';
import { computeStats } from './stats.js';
import { xpForLevel } from './progression.js';
import { getCharacter } from '../content/characters.js';
import { getWeapon } from '../content/weapons.js';

/**
 * 创建一个局内世界。世界是纯数据对象，不引用 DOM / Canvas。
 */
export function createWorld({ characterId = 'ginger', seed = 1 } = {}) {
  const character = getCharacter(characterId);
  const base = { ...character.base };
  const stats = computeStats(base, []);

  const player = {
    x: ARENA.w / 2,
    y: ARENA.h * 0.62,
    vx: 0,
    vy: 0,
    kx: 0,
    ky: 0,
    radius: PLAYER_RADIUS,
    hp: stats.maxHp,
    base,
    mods: [],
    stats,
    weapons: [
      {
        id: character.startWeapon,
        level: 1,
        cd: 0,
        state: { spin: 0, hits: new Map() },
      },
    ],
    level: 1,
    xp: 0,
    xpNext: xpForLevel(1),
    money: 0,
    invuln: 1.2,
    flash: 0,
    aim: -Math.PI / 2,
    facing: 1,
    moveX: 0,
    moveY: 0,
    moving: false,
    upgradeCounts: {},
    itemCounts: {},
    alive: true,
    characterId: character.id,
    sprite: character.sprite,
  };

  const world = {
    t: 0,
    seed,
    player,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    pickups: [],
    traps: [],
    effects: [],
    view: { w: 390, h: 844 },
    camera: { x: ARENA.w / 2, y: ARENA.h / 2 },
    arena: ARENA,
    nextId: 1,
    shake: 0,
    hitFlash: 0,
    boss: null,
    bossDefeated: false,
    playerDead: false,
    stats: { kills: 0, damageDealt: 0, moneyEarned: 0, xpEarned: 0, shots: 0 },
    spawnCount: 0,
  };
  updateCamera(world);
  return world;
}

export function nextEntityId(world) {
  return (world.nextId += 1);
}

/** 摄像机跟随，并夹在竞技场范围内；视口大于场地时居中。 */
export function updateCamera(world) {
  const view = world.view;
  const arena = world.arena;
  const p = world.player;
  if (view.w >= arena.w) world.camera.x = arena.w / 2;
  else world.camera.x = Math.max(view.w / 2, Math.min(arena.w - view.w / 2, p.x));
  if (view.h >= arena.h) world.camera.y = arena.h / 2;
  else world.camera.y = Math.max(view.h / 2, Math.min(arena.h - view.h / 2, p.y));
}

/** 视口在世界坐标中的矩形。 */
export function viewRect(world) {
  const v = world.view;
  return {
    left: world.camera.x - v.w / 2,
    top: world.camera.y - v.h / 2,
    right: world.camera.x + v.w / 2,
    bottom: world.camera.y + v.h / 2,
    w: v.w,
    h: v.h,
  };
}

export function addWeapon(player, weaponId) {
  const def = getWeapon(weaponId);
  if (!def) return null;
  const owned = player.weapons.find((w) => w.id === weaponId);
  if (owned) {
    if (owned.level >= def.levels.length) return null;
    owned.level += 1;
    return owned;
  }
  if (player.weapons.length >= 6) return null;
  const weapon = { id: weaponId, level: 1, cd: 0, state: { spin: 0, hits: new Map() } };
  player.weapons.push(weapon);
  return weapon;
}