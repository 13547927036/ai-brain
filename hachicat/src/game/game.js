import { createWorld, updateCamera, viewRect } from './world.js';
import { createRng } from './rng.js';
import { WAVES, getWave, pickFromPool, waveClearReward, TOTAL_WAVES } from '../content/waves.js';
import { getCommission, commissionPayout, commissionRank } from '../content/commissions.js';
import { ALL_ENEMIES, scaleEnemy } from '../content/enemies.js';
import { getCharacter } from '../content/characters.js';
import { STAT_META, formatMods, formatMod } from '../content/stats.js';
import { WEAPON_ICONS } from '../content/assets.js';
import { getWeapon } from '../content/weapons.js';
import { ITEM_BY_ID } from '../content/items.js';
import { stepPlayerMovement } from './systems/movement.js';
import { stepWeapons } from './systems/weapons.js';
import { stepEnemies, spawnEnemy } from './systems/enemies.js';
import { stepBullets, stepEnemyBullets } from './systems/projectiles.js';
import { stepPickups, collectAllPickups } from './systems/pickups.js';
import { stepEffects } from './systems/effects.js';
import { healPlayer } from './systems/damage.js';
import {
  xpForLevel,
  rollUpgradeOptions,
  applyUpgrade,
  generateShop,
  buyOffer,
  rerollShop,
  buyHeal,
  healPrice,
  canEquipWeapon,
  hasFreeWeaponSlot,
  synthesizeWeapon,
  listSynthesis,
} from './progression.js';

/**
 * 局内总控：状态机 + 波次 + 升级 + 商店 + 结算。
 * 不接触 DOM、Canvas、localStorage —— 平台能力全部在外层注入。
 */
export class Game {
  constructor({ seed = 1, theme = 'neon' } = {}) {
    this.baseSeed = seed >>> 0;
    this.runs = 0;
    this.theme = theme;
    this.mode = 'idle';
    this.world = null;
    this.waveIndex = 0;
    this.waveTime = 0;
    this.waveDuration = 0;
    this.wave = null;
    this.spawnTimer = 0;
    this.pendingLevels = 0;
    this.upgradeOptions = null;
    this.shop = null;
    this.result = null;
    this.events = [];
    this.totalTime = 0;
    this.characterId = 'ginger';
    this.lastReward = 0;
    this.rng = createRng(this.baseSeed);
    this.viewport = { w: 390, h: 844 };
  }

  setViewport(w, h) {
    this.viewport.w = w;
    this.viewport.h = h;
    if (this.world) {
      this.world.view.w = w;
      this.world.view.h = h;
      updateCamera(this.world);
    }
  }

  startRun(characterId = 'ginger', seed) {
    this.runs += 1;
    this.characterId = characterId;
    const runSeed = (seed ?? this.baseSeed + this.runs * 7919) >>> 0;
    this.rng = createRng(runSeed);
    this.world = createWorld({ characterId, seed: runSeed });
    this.world.rng = this.rng;
    this.world.view.w = this.viewport.w;
    this.world.view.h = this.viewport.h;
    this.mode = 'battle';
    this.waveIndex = 0;
    this.pendingLevels = 0;
    this.upgradeOptions = null;
    this.shop = null;
    this.result = null;
    this.events.length = 0;
    this.totalTime = 0;
    this.lastReward = 0;
    this.startWave(1);
    return this.world;
  }

  startWave(n) {
    const wave = getWave(n);
    this.waveIndex = n;
    this.wave = wave;
    this.waveIndexForScaling = n;
    this.waveTime = 0;
    this.waveDuration = wave.duration;
    this.spawnTimer = 0.4;
    this.mode = 'battle';

    const w = this.world;
    w.waveIndex = n;
    w.enemies.length = 0;
    w.bullets.length = 0;
    w.enemyBullets.length = 0;
    w.traps.length = 0;
    w.effects.length = 0;
    w.player.invuln = 1.1;
    w.bossDefeated = false;
    w.boss = null;
    if (w.player) w.player.hp = Math.max(w.player.hp, 1);

    this.emit('waveStart', { wave: n, boss: !!wave.boss, name: wave.name });
    if (wave.boss) this.spawnBoss(wave.boss);
  }

  spawnBoss(bossId) {
    const def = scaleEnemy(ALL_ENEMIES[bossId], this.waveIndex, true);
    const w = this.world;
    spawnEnemy(w, def, w.arena.w / 2, w.arena.h * 0.3, this.rng);
    this.emit('bossSpawn', { name: def.name });
  }

  update(dt) {
    if (this.mode !== 'battle' || !this.world) return;
    const w = this.world;
    const p = w.player;
    const prevHp = p.hp;

    w.t += dt;
    this.totalTime += dt;

    stepPlayerMovement(w, dt);
    stepWeapons(w, dt);
    stepEnemies(w, dt);
    stepBullets(w, dt);
    stepEnemyBullets(w, dt);
    stepPickups(w, dt);
    stepEffects(w, dt);
    updateCamera(w);

    if (p.hp < prevHp - 0.01) this.emit('hurt', { amount: prevHp - p.hp });

    this.spawnTick(dt);
    if (!this.wave.boss) this.waveTime += dt;

    if (w.playerDead || !p.alive) {
      this.finish(false);
      return;
    }

    if (this.wave.boss && w.bossDefeated) {
      this.finish(true);
      return;
    }

    this.checkLevelUps();
    if (this.mode !== 'battle') return;

    if (!this.wave.boss && this.waveTime >= this.waveDuration) {
      this.endWave();
    }
  }

  spawnTick(dt) {
    const wave = this.wave;
    const w = this.world;
    if (!wave || !w) return;
    const alive = w.enemies.length;
    if (alive >= wave.maxAlive) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    this.spawnTimer = wave.interval * (0.75 + this.rng() * 0.5);
    const id = pickFromPool(wave.pool, this.rng);
    const def = scaleEnemy(ALL_ENEMIES[id], this.waveIndex, false);
    const pos = this.spawnPosition(def.radius);
    spawnEnemy(w, def, pos.x, pos.y, this.rng);
  }

  spawnPosition(radius) {
    const w = this.world;
    const p = w.player;
    const view = viewRect(w);
    const arena = w.arena;
    const margin = 55;

    for (let i = 0; i < 24; i++) {
      const side = this.rng.int(0, 3);
      let x;
      let y;
      if (side === 0) {
        x = this.rng.range(view.left - margin, view.right + margin);
        y = view.top - margin;
      } else if (side === 1) {
        x = this.rng.range(view.left - margin, view.right + margin);
        y = view.bottom + margin;
      } else if (side === 2) {
        x = view.left - margin;
        y = this.rng.range(view.top - margin, view.bottom + margin);
      } else {
        x = view.right + margin;
        y = this.rng.range(view.top - margin, view.bottom + margin);
      }
      if (x < radius + 24 || x > arena.w - radius - 24) continue;
      if (y < radius + 24 || y > arena.h - radius - 24) continue;
      if (Math.hypot(x - p.x, y - p.y) < 250) continue;
      return { x, y };
    }

    for (let i = 0; i < 24; i++) {
      const x = this.rng.range(radius + 24, arena.w - radius - 24);
      const y = this.rng.range(radius + 24, arena.h - radius - 24);
      if (Math.hypot(x - p.x, y - p.y) > 300) return { x, y };
    }
    return { x: p.x + 320, y: p.y - 320 };
  }

  checkLevelUps() {
    const p = this.world.player;
    let gained = 0;
    while (p.xp >= p.xpNext && gained < 20) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.xpNext = xpForLevel(p.level);
      this.pendingLevels += 1;
      gained += 1;
    }
    if (gained > 0) this.emit('levelup', { level: p.level });

    if (this.pendingLevels > 0 && (this.mode === 'battle' || this.mode === 'shop')) {
      this.openUpgrade();
    }
  }

  openUpgrade() {
    const options = rollUpgradeOptions(this.world.player, this.rng, 3);
    if (!options.length) {
      this.pendingLevels = 0;
      return;
    }
    this.modeBeforeUpgrade = this.mode;
    this.upgradeOptions = options;
    this.mode = 'levelup';
  }

  chooseUpgrade(index) {
    if (this.mode !== 'levelup' || !this.upgradeOptions) return false;
    const upgrade = this.upgradeOptions[index];
    if (!upgrade) return false;
    applyUpgrade(this.world.player, upgrade);
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    this.upgradeOptions = null;

    if (this.pendingLevels > 0) {
      const next = rollUpgradeOptions(this.world.player, this.rng, 3);
      if (next.length) this.upgradeOptions = next;
      else this.pendingLevels = 0;
    }
    if (!this.upgradeOptions) {
      this.mode = this.modeBeforeUpgrade === 'shop' ? 'shop' : 'battle';
    }
    this.emit('upgradeChosen', { id: upgrade.id });
    return true;
  }

  endWave() {
    const reward = waveClearReward(this.waveIndex);
    const p = this.world.player;
    collectAllPickups(this.world);
    p.money += reward;
    this.world.stats.moneyEarned += reward;
    this.lastReward = reward;

    this.shop = generateShop(p, this.rng, this.waveIndex);
    this.mode = 'shop';

    this.emit('waveClear', { wave: this.waveIndex, reward });
    this.emit('shopOpen', { wave: this.waveIndex });
    // 收尾时捡到的经验也要能升级；升级完会回到商店
    this.checkLevelUps();
  }

  openShop() {
    this.shop = generateShop(this.world.player, this.rng, this.waveIndex);
    this.mode = 'shop';
    this.emit('shopOpen', { wave: this.waveIndex });
  }

  buy(index) {
    if (this.mode !== 'shop' || !this.shop) return { ok: false, reason: 'mode' };
    const res = buyOffer(this.world.player, this.shop, index);
    if (res.ok) {
      this.shop.healPrice = healPrice(this.world.player);
      this.emit('purchase', res);
    }
    return res;
  }

  reroll() {
    if (this.mode !== 'shop' || !this.shop) return { ok: false, reason: 'mode' };
    const res = rerollShop(this.world.player, this.shop, this.rng, this.waveIndex);
    if (res.ok) this.emit('reroll', res);
    return res;
  }

  synthesize(weaponId) {
    if (this.mode !== 'shop' || !this.shop) return { ok: false, reason: 'mode' };
    const res = synthesizeWeapon(this.world.player, weaponId);
    if (res.ok) {
      this.shop.healPrice = healPrice(this.world.player);
      this.emit('synthesize', res);
    }
    return res;
  }

  heal() {
    if (this.mode !== 'shop' || !this.shop) return { ok: false, reason: 'mode' };
    const res = buyHeal(this.world.player, this.shop);
    if (!res.ok) return res;
    healPlayer(this.world, res.amount);
    this.shop.healPrice = healPrice(this.world.player);
    this.emit('heal', res);
    return res;
  }

  nextWave() {
    if (this.mode !== 'shop') return false;
    if (this.waveIndex >= TOTAL_WAVES) return false;
    this.shop = null;
    this.startWave(this.waveIndex + 1);
    return true;
  }

  pause() {
    if (this.mode !== 'battle') return false;
    this.mode = 'paused';
    this.emit('pause');
    return true;
  }

  resume() {
    if (this.mode !== 'paused') return false;
    this.mode = 'battle';
    this.emit('resume');
    return true;
  }

  quit() {
    this.mode = 'idle';
    this.world = null;
    this.shop = null;
    this.upgradeOptions = null;
    this.result = null;
  }

  restart(characterId = this.characterId) {
    return this.startRun(characterId);
  }

  finish(victory) {
    if (this.mode === 'result') return;
    const w = this.world;
    const p = w.player;
    const commission = getCommission();
    const payout = commissionPayout(commission, {
      moneyEarned: w.stats.moneyEarned || 0,
      victory,
    });
    this.mode = 'result';
    this.result = {
      victory,
      commissionId: commission.id,
      payout,
      rank: commissionRank(commission, { wave: this.waveIndex, victory }),
      characterId: this.characterId,
      wave: this.waveIndex,
      boss: !!this.wave?.boss,
      level: p.level,
      kills: w.stats.kills,
      money: p.money,
      time: this.totalTime,
      damage: Math.round(w.stats.damageDealt),
    };
    this.emit(victory ? 'victory' : 'defeat', this.result);
  }

  emit(type, payload = {}) {
    this.events.push({ type, ...payload });
    if (this.events.length > 80) this.events.splice(0, this.events.length - 80);
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** UI 快照：React 只读这个对象，不直接摸世界内部结构。 */
  getSnapshot() {
    const w = this.world;
    const character = this.characterId ? getCharacter(this.characterId) : null;
    if (!w) {
      return {
        mode: this.mode,
        theme: this.theme,
        wave: 0,
        totalWaves: TOTAL_WAVES,
        character: character ? { id: character.id, name: character.name } : null,
      };
    }
    const p = w.player;
    const bossAlive = w.boss && !w.boss.dead ? w.boss : null;

    return {
      mode: this.mode,
      theme: this.theme,
      character: character ? { id: character.id, name: character.name, sprite: character.sprite } : null,
      wave: this.waveIndex,
      totalWaves: TOTAL_WAVES,
      waveName: this.wave?.name || '',
      waveTime: this.waveTime,
      waveDuration: this.waveDuration,
      bossWave: !!this.wave?.boss,
      hp: Math.max(0, Math.ceil(p.hp)),
      maxHp: Math.round(p.stats.maxHp),
      level: p.level,
      xp: Math.floor(p.xp),
      xpNext: p.xpNext,
      money: p.money,
      kills: w.stats.kills,
      alive: p.alive,
      weapons: p.weapons.map((weapon) => ({
        id: weapon.id,
        name: getWeapon(weapon.id)?.name || weapon.id,
        level: weapon.level,
        icon: WEAPON_ICONS[weapon.id] || 'icon.paw',
      })),
      stats: { ...p.stats },
      boss: bossAlive
        ? { name: bossAlive.name, hp: Math.max(0, Math.ceil(bossAlive.hp)), maxHp: bossAlive.maxHp }
        : null,
      enemies: w.enemies.length,
      upgradeOptions: (this.upgradeOptions || []).map((u) => ({
        id: u.id,
        name: u.name,
        rarity: u.rarity,
        flavor: u.flavor,
        mods: [formatMod({ stat: u.stat, amount: u.amount })],
        icon: STAT_META[u.stat]?.icon || 'paw',
        count: p.upgradeCounts[u.id] || 0,
      })),
      shop: this.shop
        ? {
            rerolls: this.shop.rerolls,
            rerollCost: this.shop.rerollCost + this.shop.rerolls * 3,
            healPrice: this.shop.healPrice ?? healPrice(p),
            hp: Math.ceil(p.hp),
            maxHp: Math.round(p.stats.maxHp),
            offers: this.shop.offers.map((offer, index) => this.describeOffer(offer, index)),
            synthesis: listSynthesis(p),
          }
        : null,
      result: this.result,
      reward: this.lastReward,
    };
  }

  describeOffer(offer, index) {
    const p = this.world.player;
    if (offer.type === 'weapon') {
      const def = getWeapon(offer.weaponId);
      const copy = !!offer.copy;
      const blocked = copy ? !hasFreeWeaponSlot(p) : !canEquipWeapon(p, offer.weaponId);
      return {
        index,
        key: offer.key,
        type: 'weapon',
        copy,
        weaponId: offer.weaponId,
        name: def?.name || offer.weaponId,
        level: offer.level,
        rarity: def?.rarity || 1,
        price: offer.price,
        sold: offer.sold,
        desc: def?.desc || '',
        icon: WEAPON_ICONS[offer.weaponId] || 'icon.paw',
        tag: copy
          ? `副本 Lv.${offer.level} · 可合成`
          : offer.level > 1
            ? `升级至 Lv.${offer.level}`
            : '新武器',
        canBuy: !offer.sold && p.money >= offer.price && !blocked,
        reason: blocked ? '武器栏已满' : '',
      };
    }
    const item = ITEM_BY_ID[offer.itemId];
    return {
      index,
      key: offer.key,
      type: 'item',
      name: item?.name || offer.itemId,
      rarity: item?.rarity || 1,
      price: offer.price,
      sold: offer.sold,
      desc: item?.desc || '',
      mods: item ? formatMods(item.mods) : '',
      icon: STAT_META[item?.mods?.[0]?.stat]?.icon || 'paw',
      tag: '道具',
      canBuy: !offer.sold && p.money >= offer.price,
      reason: '',
    };
  }

  /* ---------------- 调试接口（开发期用） ---------------- */

  debugJumpWave(n) {
    if (!this.world) return false;
    this.startWave(Math.max(1, Math.min(TOTAL_WAVES, n)));
    return true;
  }

  debugMoney(amount) {
    if (!this.world) return false;
    this.world.player.money += amount;
    return true;
  }

  debugAddWeapon(id, level = 1) {
    if (!this.world) return false;
    this.world.player.weapons.push({
      id,
      level: Math.max(1, Math.min(5, level)),
      cd: 0,
      state: { spin: 0, hits: new Map() },
    });
    return true;
  }

  debugHeal() {
    if (!this.world) return false;
    this.world.player.hp = this.world.player.stats.maxHp;
    return true;
  }

  debugKillBoss() {
    const boss = this.world?.boss;
    if (!boss) return false;
    boss.hp = 0;
    boss.dead = true;
    this.world.bossDefeated = true;
    return true;
  }

  debugWin() {
    if (!this.world || this.mode === 'result') return false;
    this.finish(true);
    return true;
  }

  debugLose() {
    if (!this.world || this.mode === 'result') return false;
    this.world.player.hp = 0;
    this.world.player.alive = false;
    this.world.playerDead = true;
    this.finish(false);
    return true;
  }

  debugLevelUp() {
    if (!this.world || this.mode !== 'battle') return false;
    this.pendingLevels += 1;
    this.openUpgrade();
    return true;
  }
}