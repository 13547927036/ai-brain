/**
 * 平衡模拟：用确定性的无头机器人跑完整 12 波，统计每波收入 / 支出 / 受伤 / 成长。
 *
 * 重要：这是“模拟数据”，不是真人试玩。机器人会完美读预警、侧闪弹幕，因此它的
 * 通关率是玩家表现的上限；真机手感仍需人工试玩确认。
 *
 * 用法：
 *   node tools/balance-sim.mjs --scenario all --runs 3 --json .tmp/after.json
 *   node tools/balance-sim.mjs --scenario normal --build ranged --runs 3
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { Game } from '../src/game/game.js';

const SCENARIOS = ['none', 'normal', 'weapon', 'heal', 'reroll', 'slowstart'];
const BUILDS = {
  all: null,
  ranged: ['hairball', 'laser'],
  melee: ['claw', 'hiss', 'tail', 'trap'],
};
const UPGRADE_PRIORITY = [
  'berserk', 'fury', 'sharp_claws',
  'overclock', 'frenzy', 'quick_paws',
  'nine_lives', 'thick_fur',
  'assassin', 'eagle_eye',
  'iron_hide', 'scab',
  'wide_net', 'sharp_fang',
  'light_step', 'magnet', 'long_whiskers', 'nap',
];

function parseArgs(argv) {
  const opts = {
    runs: 4,
    scenario: 'normal',
    build: 'all',
    characters: ['hachiware', 'chiikawa', 'usagi'],
    json: '',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--runs') opts.runs = Number(argv[++i]) || 4;
    else if (a === '--scenario') opts.scenario = argv[++i] || 'normal';
    else if (a === '--build') opts.build = argv[++i] || 'all';
    else if (a === '--character') opts.characters = [argv[++i] || 'hachiware'];
    else if (a === '--json') opts.json = argv[++i] || '';
  }
  if (!(opts.build in BUILDS)) throw new Error(`未知 build：${opts.build}`);
  return opts;
}

function pickUpgrade(options) {
  let best = 0;
  let bestScore = -1;
  options.forEach((opt, i) => {
    const idx = UPGRADE_PRIORITY.indexOf(opt.id);
    const score = (idx < 0 ? 0 : UPGRADE_PRIORITY.length - idx) + (3 - opt.rarity) * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/** 机器人走位：威胁排斥 + 弹幕侧闪 + 拾取物吸引 + 场地边缘回拉。 */
function botMove(w) {
  const p = w.player;
  const lowHp = p.hp < p.stats.maxHp * 0.5;
  let ax = 0;
  let ay = 0;

  for (const e of w.enemies) {
    if (e.dead) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const danger = e.radius + (e.isBoss ? 130 : 84);
    if (d < danger) {
      const wgt = (danger - d) / danger;
      ax += (dx / d) * wgt * 3.4;
      ay += (dy / d) * wgt * 3.4;
    }
    // 危险预警：冲撞 / 自爆前远离
    if ((e.warnT > 0 || e.fuseT > 0 || e.telegraph > 0) && d < 220) {
      const wgt = (220 - d) / 220;
      ax += (dx / d) * wgt * 2.6;
      ay += (dy / d) * wgt * 2.6;
    }
    // 首领冲刺预警：垂直方向侧闪
    if (e.isBoss && e.telegraph > 0 && d < 520) {
      const nx = -dy / d;
      const ny = dx / d;
      ax += nx * (p.x < e.x ? 1 : -1) * 1.8;
      ay += ny * (p.y < e.y ? 1 : -1) * 1.8;
    }
  }

  for (const b of w.enemyBullets) {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 90) {
      const nx = -b.vy;
      const ny = b.vx;
      const nl = Math.hypot(nx, ny) || 1;
      ax += (nx / nl) * 1.5;
      ay += (ny / nl) * 1.5;
    }
  }

  if (!lowHp) {
    let best = null;
    let bestD = 1e9;
    for (const it of w.pickups) {
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    if (best && bestD > 26 && bestD < 320) {
      ax += ((best.x - p.x) / bestD) * 0.8;
      ay += ((best.y - p.y) / bestD) * 0.8;
    }
  }

  const margin = 170;
  if (p.x < margin) ax += ((margin - p.x) / margin) * 2;
  if (p.x > w.arena.w - margin) ax -= ((p.x - (w.arena.w - margin)) / margin) * 2;
  if (p.y < margin) ay += ((margin - p.y) / margin) * 2;
  if (p.y > w.arena.h - margin) ay -= ((p.y - (w.arena.h - margin)) / margin) * 2;

  const len = Math.hypot(ax, ay);
  if (len > 0.05) {
    w.player.moveX = ax / len;
    w.player.moveY = ay / len;
  } else {
    w.player.moveX = 0;
    w.player.moveY = 0;
  }
}

function shopPlan(scenario, snap, build = 'all') {
  const allowed = BUILDS[build] ? new Set(BUILDS[build]) : null;
  const offers = snap.shop.offers.map((o, i) => ({ o, i }));
  const buys = [];
  let rerolls = 0;
  let heal = false;

  const weaponOffers = offers
    .filter(({ o }) => o.type === 'weapon' && o.canBuy && (!allowed || allowed.has(o.weaponId)))
    .sort((a, b) => {
      const ac = a.o.copy ? 0 : 1;
      const bc = b.o.copy ? 0 : 1;
      if (ac !== bc) return ac - bc;
      return a.o.price - b.o.price;
    });
  const itemOffers = offers
    .filter(({ o }) => o.type === 'item' && o.canBuy)
    .sort((a, b) => a.o.price - b.o.price);

  const money = snap.money;
  const healPrice = snap.shop.healPrice;
  const healNow = snap.hp < snap.maxHp && money >= healPrice;

  if (scenario === 'none') return { buys, rerolls, heal: false };

  if (scenario === 'slowstart' && snap.wave <= 3) return { buys, rerolls, heal: false };

  if (scenario === 'heal') {
    if (healNow && snap.hp < snap.maxHp * 0.85) heal = true;
    const reserve = healPrice * 2;
    for (const { i, o } of weaponOffers) {
      if (snap.money - spent(buys, offers) < o.price + reserve) break;
      buys.push(i);
    }
    for (const { i, o } of itemOffers) {
      if (money - spent(buys, offers) < o.price + reserve) break;
      buys.push(i);
    }
    return { buys, rerolls, heal };
  }

  if (scenario === 'weapon') {
    if (healNow && snap.hp < snap.maxHp * 0.35) heal = true;
    for (const { i, o } of weaponOffers) {
      if (money - spent(buys, offers) < o.price) break;
      buys.push(i);
    }
    for (const { i, o } of itemOffers) {
      if (money - spent(buys, offers) < o.price + 40) break;
      buys.push(i);
    }
    return { buys, rerolls, heal };
  }

  if (scenario === 'reroll') {
    // 频繁刷新：只要还有余钱就刷 2 次，专门测试刷新费与随机性
    rerolls = money >= snap.shop.rerollCost + 45 ? 2 : 0;
    if (healNow && snap.hp < snap.maxHp * 0.6) heal = true;
    for (const { i, o } of weaponOffers) {
      if (money - spent(buys, offers) < o.price) break;
      buys.push(i);
    }
    for (const { i, o } of itemOffers) {
      if (money - spent(buys, offers) < o.price) break;
      buys.push(i);
    }
    return { buys, rerolls, heal };
  }

  // normal：武器优先，道具其次，残血治疗
  if (healNow && snap.hp < snap.maxHp * 0.6) heal = true;
  const reserve = heal ? healPrice : 0;
  for (const { i, o } of weaponOffers) {
    if (money - spent(buys, offers) < o.price + reserve) break;
    buys.push(i);
  }
  for (const { i, o } of itemOffers) {
    if (money - spent(buys, offers) < o.price + reserve) break;
    buys.push(i);
  }
  return { buys, rerolls, heal };
}

function spent(buys, offers) {
  return buys.reduce((n, i) => n + offers.find(({ i: idx }) => idx === i).o.price, 0);
}

function runOne(character, seed, scenario, build = 'all', label = scenario) {
  const g = new Game({ seed });
  g.setViewport(390, 844);
  g.startRun(character, seed);

  const waveRows = [];
  let row = null;
  let lastLevel = 1;
  let lastKills = 0;
  let lastXp = 0;
  let lastEarned = 0;
  let lastDamageDealt = 0;
  let hpLost = 0;
  let lastHp = g.world.player.hp;
  let maxEnemies = 0;

  const openWave = (n, mode = 'battle') => {
    const p = g.world.player;
    row = {
      wave: n,
      mode,
      hpStart: Math.round(p.hp),
      maxHp: Math.round(p.stats.maxHp),
      moneyStart: p.money,
      levelStart: p.level,
      kills: 0,
      damageTaken: 0,
      damageDealt: 0,
      xp: 0,
      earned: 0,
      levelUps: 0,
      shopSpent: 0,
      shopBuys: 0,
      healPaid: 0,
      healed: 0,
      rerolls: 0,
      maxEnemies: 0,
      startTime: Math.round(g.totalTime * 10) / 10,
      duration: 0,
      victory: false,
    };
    waveRows.push(row);
    lastLevel = p.level;
    lastKills = g.world.stats.kills;
    lastXp = g.world.stats.xpEarned;
    lastEarned = g.world.stats.moneyEarned;
    lastDamageDealt = g.world.stats.damageDealt;
    hpLost = 0;
    maxEnemies = 0;
  };

  const closeWave = () => {
    if (!row) return;
    const p = g.world.player;
    row.kills = g.world.stats.kills - lastKills;
    row.xp = g.world.stats.xpEarned - lastXp;
    row.earned = g.world.stats.moneyEarned - lastEarned;
    row.damageDealt = Math.round(g.world.stats.damageDealt - lastDamageDealt);
    row.damageTaken = Math.round(hpLost);
    row.levelUps = p.level - lastLevel;
    row.hpEnd = Math.round(p.hp);
    row.moneyEnd = p.money;
    row.maxEnemies = maxEnemies;
    row.duration = Math.round((g.totalTime - row.startTime) * 10) / 10;
  };

  openWave(1);
  let guard = 0;
  const maxSteps = 60 * 60 * 20;

  while (guard < maxSteps && g.mode !== 'result') {
    const p = g.world.player;
    if (g.mode === 'battle') {
      // 记录本帧掉血（只统计真实受伤，回血/上限变化不算）
      if (p.hp < lastHp) hpLost += lastHp - p.hp;
      lastHp = p.hp;
      if (g.world.enemies.length > maxEnemies) maxEnemies = g.world.enemies.length;

      botMove(g.world);
      const beforeWave = g.waveIndex;
      g.update(1 / 60);
      guard += 1;
      if (g.mode === 'result') {
        closeWave();
        row.victory = !!g.result?.victory;
        break;
      }
      if (g.waveIndex !== beforeWave) {
        closeWave();
        openWave(g.waveIndex);
        lastHp = g.world.player.hp;
      }
      continue;
    }

    if (g.mode === 'levelup') {
      const snap = g.getSnapshot();
      g.chooseUpgrade(pickUpgrade(snap.upgradeOptions));
      continue;
    }

    if (g.mode === 'shop') {
      closeWave();
      const snap = g.getSnapshot();
      const plan = shopPlan(scenario, snap, build);
      const moneyBefore = snap.money;
      const healPriceBefore = snap.shop.healPrice;
      let healed = 0;
      let healPaid = 0;
      let rerollCount = 0;
      for (let r = 0; r < plan.rerolls; r++) {
        const res = g.reroll();
        if (!res.ok) break;
        rerollCount += 1;
      }
      // 刷新后重新取一次可购买项
      let buyList = plan.buys;
      let offersBefore = snap.shop.offers;
      if (rerollCount > 0) {
        const s2 = g.getSnapshot();
        const plan2 = shopPlan(scenario, s2, build);
        buyList = plan2.buys;
        offersBefore = s2.shop.offers;
      }
      const bought = [];
      for (const i of buyList) {
        const res = g.buy(i);
        if (res.ok) bought.push(offersBefore[i]);
      }
      if (plan.heal) {
        const res = g.heal();
        if (res.ok) {
          healed = res.amount;
          healPaid = res.price ?? healPriceBefore;
        }
      }
      // 正常玩家会立刻合成同名同等级武器
      for (let s = 0; s < 6; s++) {
        const list = g.getSnapshot().shop?.synthesis || [];
        if (!list.length) break;
        g.synthesize(list[0].id);
      }
      const after = g.getSnapshot();
      row.shopSpent = moneyBefore - after.money;
      row.shopBuys = bought.length;
      row.boughtWeapons = bought.filter((o) => o.type === 'weapon' && !o.copy).length;
      row.boughtCopies = bought.filter((o) => o.type === 'weapon' && o.copy).length;
      row.boughtItems = bought.filter((o) => o.type === 'item').length;
      row.healPaid = healPaid;
      row.healed = healed;
      row.heals = healed > 0 ? 1 : 0;
      row.rerolls = rerollCount;
      row.moneyAfterShop = after.money;
      row.hpAfterShop = after.hp;
      if (!g.nextWave()) {
        // 第 11 波结束进入第 12 波；若已到 12 波仍无下一波，不应发生
        break;
      }
      openWave(g.waveIndex);
      lastHp = g.world.player.hp;
      continue;
    }

    // paused / idle 不应出现
    break;
  }

  const p = g.world.player;
  const result = g.result || {};
  return {
    character,
    seed,
    scenario: label,
    baseScenario: scenario,
    build,
    victory: !!result.victory,
    wave: result.wave || g.waveIndex,
    time: result.time ? Math.round(result.time) : Math.round(g.totalTime),
    level: p.level,
    kills: g.world.stats.kills,
    maxHp: Math.round(p.stats.maxHp),
    hpEnd: Math.round(p.hp),
    moneyEnd: p.money,
    moneyEarned: g.world.stats.moneyEarned,
    damageTaken: waveRows.reduce((n, r) => n + r.damageTaken, 0),
    damageTakenBy: { ...(g.world.stats.damageTakenBy || {}) },
    spawnedBy: { ...(g.world.stats.spawnedBy || {}) },
    killedBy: { ...(g.world.stats.killedBy || {}) },
    dashWarns: g.world.stats.dashWarns || 0,
    bombFuses: g.world.stats.bombFuses || 0,
    summons: g.world.stats.summons || 0,
    healsGiven: g.world.stats.heals || 0,
    bossBarrages: g.world.stats.bossBarrages || 0,
    heals: waveRows.reduce((n, r) => n + (r.heals || 0), 0),
    rerolls: waveRows.reduce((n, r) => n + (r.rerolls || 0), 0),
    boughtWeapons: waveRows.reduce((n, r) => n + (r.boughtWeapons || 0), 0),
    boughtCopies: waveRows.reduce((n, r) => n + (r.boughtCopies || 0), 0),
    boughtItems: waveRows.reduce((n, r) => n + (r.boughtItems || 0), 0),
    weapons: p.weapons.map((w) => ({ id: w.id, level: w.level })),
    waves: waveRows,
  };
}

function aggregate(rows) {
  const byScenario = new Map();
  for (const r of rows) {
    if (!byScenario.has(r.scenario)) byScenario.set(r.scenario, []);
    byScenario.get(r.scenario).push(r);
  }
  const out = {};
  for (const [scenario, list] of byScenario) {
    const wins = list.filter((r) => r.victory).length;
    const avg = (fn) => Math.round((list.reduce((n, r) => n + fn(r), 0) / list.length) * 10) / 10;
    const waveAgg = [];
    for (let w = 1; w <= 12; w++) {
      const rowsForWave = list.map((r) => r.waves.find((x) => x.wave === w)).filter(Boolean);
      if (!rowsForWave.length) continue;
      const mean = (fn) => Math.round((rowsForWave.reduce((n, x) => n + fn(x), 0) / rowsForWave.length) * 10) / 10;
      waveAgg.push({
        wave: w,
        reached: rowsForWave.length,
        kills: mean((x) => x.kills),
        damageTaken: mean((x) => x.damageTaken),
        damageDealt: mean((x) => x.damageDealt),
        xp: mean((x) => x.xp),
        earned: mean((x) => x.earned),
        shopSpent: mean((x) => x.shopSpent),
        moneyEnd: mean((x) => x.moneyEnd ?? x.moneyStart),
        levelUps: mean((x) => x.levelUps),
        maxEnemies: mean((x) => x.maxEnemies),
        duration: mean((x) => x.duration),
        deaths: rowsForWave.filter((x) => !x.victory && x.wave === w).length,
      });
    }
    out[scenario] = {
      runs: list.length,
      wins,
      winRate: Math.round((wins / list.length) * 1000) / 10,
      avgTime: avg((r) => r.time),
      avgLevel: avg((r) => r.level),
      avgKills: avg((r) => r.kills),
      avgDamageTaken: avg((r) => r.damageTaken),
      avgMoneyEnd: avg((r) => r.moneyEnd),
      avgMoneyEarned: avg((r) => r.moneyEarned),
      avgMaxHp: avg((r) => r.maxHp),
      avgShopSpent: avg((r) => r.waves.reduce((n, x) => n + x.shopSpent, 0)),
      avgHeals: avg((r) => r.heals),
      avgRerolls: avg((r) => r.rerolls),
      avgWeaponsBought: avg((r) => r.boughtWeapons),
      avgCopiesBought: avg((r) => r.boughtCopies),
      avgItemsBought: avg((r) => r.boughtItems),
      avgDashWarns: avg((r) => r.dashWarns || 0),
      avgBombFuses: avg((r) => r.bombFuses || 0),
      avgSummons: avg((r) => r.summons || 0),
      avgHealsGiven: avg((r) => r.healsGiven || 0),
      avgBossBarrages: avg((r) => r.bossBarrages || 0),
      spawnedBy: sumMap(list, 'spawnedBy'),
      killedBy: sumMap(list, 'killedBy'),
      damageTakenBy: sumMap(list, 'damageTakenBy'),
      waves: waveAgg,
    };
  }
  return out;
}

function sumMap(list, key) {
  const out = {};
  for (const r of list) {
    for (const [k, v] of Object.entries(r[key] || {})) out[k] = (out[k] || 0) + v;
  }
  return out;
}

const opts = parseArgs(process.argv);
const rows = [];
const builds = opts.build === 'all' ? ['all'] : [opts.build];
for (const scenario of opts.scenario === 'all' ? SCENARIOS : [opts.scenario]) {
  for (const build of builds) {
    const label = build === 'all' ? scenario : `${scenario}:${build}`;
    for (const character of opts.characters) {
      for (let i = 0; i < opts.runs; i++) {
        const seed = 20260101 + i * 7919;
        const r = runOne(character, seed, scenario, build, label);
        rows.push(r);
        console.log(
          `${label.padEnd(15)} ${character.padEnd(9)} seed=${seed} ${r.victory ? 'WIN ' : 'LOSE'} w${String(r.wave).padStart(2)} ` +
            `lv${String(r.level).padStart(2)} kills=${String(r.kills).padStart(3)} hp=${r.hpEnd}/${r.maxHp} ` +
            `dmg=${String(r.damageTaken).padStart(3)} $=${String(r.moneyEnd).padStart(3)}`
        );
      }
    }
  }
}

const agg = aggregate(rows);
console.log('\n=== 汇总 ===');
for (const [scenario, a] of Object.entries(agg)) {
  console.log(
    `${scenario.padEnd(15)} 胜率=${a.winRate}% 平均时长=${a.avgTime}s 平均等级=${a.avgLevel} ` +
      `平均击杀=${a.avgKills} 平均受伤=${a.avgDamageTaken} 结束金币=${a.avgMoneyEnd} 总材料=${a.avgMoneyEarned} ` +
      `均花=${a.avgShopSpent} 治疗=${a.avgHeals} 刷新=${a.avgRerolls} ` +
      `预警/引信/召唤/维修/首领弹幕=${a.avgDashWarns}/${a.avgBombFuses}/${a.avgSummons}/${a.avgHealsGiven}/${a.avgBossBarrages}`
  );
  console.log('  波次: ' + a.waves.map((w) => `w${w.wave}(杀${w.kills}/伤${w.damageTaken}/收${w.earned}/花${w.shopSpent}/余${w.moneyEnd})`).join(' '));
}

if (opts.json) {
  mkdirSync(opts.json.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
  writeFileSync(
    opts.json,
    JSON.stringify({ generatedAt: new Date().toISOString(), opts, rows, aggregate: agg }, null, 2)
  );
  console.log(`\nJSON → ${opts.json}`);
}
