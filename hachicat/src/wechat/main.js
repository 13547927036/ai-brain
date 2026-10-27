/**
 * 微信小游戏入口：Canvas 版界面。
 *
 * 小游戏没有 DOM / React-DOM，所以不能复用 src/ui（React）那一套。
 * 这里复用：content（数据）、game（逻辑）、render（绘制）、platform（适配）。
 * 界面部分用 Canvas 手绘 + 点击热区，保持与网页版同样的流程：
 * 菜单 → 选搭档 → 战斗 → 成长 → 补给点 → 讨伐目标 → 结算。
 *
 * 注意：尚未在开发者工具/真机验证，见 README「微信小游戏适配」。
 */
import { Game } from '../game/game.js';
import { createRenderer } from '../render/renderer.js';
import { createWeChatPlatform } from '../platform/wechat.js';
import { STORAGE_KEYS } from '../platform/types.js';
import { CHARACTERS } from '../content/characters.js';
import { getTheme } from '../content/theme.js';
import { TOTAL_WAVES } from '../content/waves.js';

const wxApi = typeof wx !== 'undefined' ? wx : null;
if (!wxApi) throw new Error('hachicat: 该入口只能在微信小游戏环境运行');

const platform = createWeChatPlatform(wxApi);
const view = platform.getViewport();
const canvas = platform.getCanvas();
const renderer = createRenderer(canvas);
renderer.resize(view.width, view.height, view.dpr);
const theme = getTheme('neon');
const ctx = canvas.getContext('2d');

const game = new Game({ seed: (Date.now() % 100000) | 0 });
game.setViewport(view.width, view.height);

const meta = readMeta();
const ui = {
  screen: 'menu', // menu | char | run
  hits: [],
  joy: { active: false, ox: 0, oy: 0, x: 0, y: 0 },
  savedResult: false,
  message: '',
  messageT: 0,
};

function readMeta() {
  try {
    return platform.storage.get(STORAGE_KEYS.meta) || { bestWave: 0, runs: 0, wins: 0 };
  } catch {
    return { bestWave: 0, runs: 0, wins: 0 };
  }
}

function saveMeta(next) {
  platform.storage.set(STORAGE_KEYS.meta, next);
}

/* ---------------- 绘制小工具 ---------------- */

function setDprTransform() {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
}

function fillRoundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

function strokeRoundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.stroke();
}

function text(str, x, y, size = 16, color = '#fff', align = 'left', weight = '400') {
  ctx.font = `${weight} ${size}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(String(str), x, y);
}

function wrapText(str, x, y, maxWidth, lineHeight, size = 14, color = '#fff') {
  ctx.font = `400 ${size}px -apple-system, "PingFang SC", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  let line = '';
  let yy = y;
  for (const ch of String(str)) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      ctx.fillText(line, x, yy);
      line = ch;
      yy += lineHeight;
    } else {
      line += ch;
    }
  }
  if (line) ctx.fillText(line, x, yy);
  return yy + lineHeight;
}

function button(x, y, w, h, label, action, payload, opts = {}) {
  const disabled = !!opts.disabled;
  ctx.fillStyle = disabled ? 'rgba(255,255,255,0.06)' : opts.primary ? theme.colors.accent : 'rgba(255,255,255,0.10)';
  fillRoundRect(x, y, w, h, 14);
  if (!disabled && !opts.primary) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    strokeRoundRect(x, y, w, h, 14);
  }
  text(label, x + w / 2, y + h / 2, opts.size || 17, disabled ? 'rgba(255,255,255,0.35)' : opts.primary ? '#06121a' : theme.colors.text, 'center', '600');
  if (!disabled) ui.hits.push({ x, y, w, h, action, payload });
}

function hit(list, x, y) {
  for (let i = list.length - 1; i >= 0; i--) {
    const r = list[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}

/* ---------------- 各界面 ---------------- */

function drawBackdrop() {
  setDprTransform();
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, theme.colors.bgTop);
  g.addColorStop(1, theme.colors.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);
}

function drawMenu() {
  drawBackdrop();
  const w = view.width;
  const h = view.height;
  const cx = w / 2;

  // 圆脸小动物剪影（不指向任何具体角色）
  ctx.save();
  ctx.translate(cx, h * 0.27);
  ctx.fillStyle = theme.colors.accent;
  ctx.beginPath();
  ctx.arc(-34, -42, 20, 0, Math.PI * 2);
  ctx.arc(34, -42, 20, 0, Math.PI * 2);
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.colors.bgTop;
  ctx.beginPath();
  ctx.arc(-20, -2, 6, 0, Math.PI * 2);
  ctx.arc(20, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.colors.accent2;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(-30, 18, 8, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(30, 18, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.colors.bgTop;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, 14);
  ctx.quadraticCurveTo(0, 20, 7, 14);
  ctx.stroke();
  ctx.restore();

  text('哈奇猫', cx, h * 0.42, 40, theme.colors.text, 'center', '800');
  text('HACHICAT', cx, h * 0.465, 12, theme.colors.accent, 'center', '600');
  text(`最佳 第 ${meta.bestWave || 0} 波 · 已玩 ${meta.runs || 0} 局`, cx, h * 0.505, 14, 'rgba(251,243,232,0.62)', 'center');
  text('非官方同人作品', cx, h * 0.535, 10, 'rgba(251,243,232,0.42)', 'center');

  button(w * 0.14, h * 0.58, w * 0.72, 56, '接取讨伐委托', 'goChar', null, { primary: true });
  button(w * 0.14, h * 0.665, w * 0.72, 46, '讨伐说明', 'help', null);
  text('拖拽移动 · 装备自动攻击', cx, h * 0.76, 13, 'rgba(251,243,232,0.5)', 'center');
  text(`共 ${TOTAL_WAVES} 波 · 第 ${TOTAL_WAVES} 波讨伐目标`, cx, h * 0.795, 13, 'rgba(251,243,232,0.5)', 'center');
}

function drawHelp() {
  drawBackdrop();
  const w = view.width;
  const h = view.height;
  text('讨伐说明', w / 2, 70, 28, theme.colors.text, 'center', '800');
  const lines = [
    '拖拽屏幕控制走位，装备会自动攻击最近的怪物。',
    '打退怪物掉经验与金币，成长时三选一强化。',
    '每波结束在路边补给点歇脚：买装备、用品，喝碗热汤。',
    '同名装备可以整理升级，最多 6 件。',
    `完成 ${TOTAL_WAVES} 波并击退巨兽「隆隆」即完成委托。`,
    '受伤后短暂无敌，别贴着怪物站。',
  ];
  let y = 120;
  for (const line of lines) y = wrapText(line, 24, y, w - 48, 24, 15, 'rgba(251,243,232,0.85)') + 8;
  button(w * 0.2, h - 100, w * 0.6, 52, '返回', 'backMenu', null, { primary: true });
}

function drawCharSelect() {
  drawBackdrop();
  const w = view.width;
  const h = view.height;
  text('选择搭档', w / 2, 58, 26, theme.colors.text, 'center', '800');
  text('三个人，三种干活方式', w / 2, 90, 13, 'rgba(251,243,232,0.6)', 'center');

  const cardH = Math.min(112, (h - 190) / 3 - 10);
  let y = 118;
  const tints = [theme.colors.accent2, theme.colors.accent, theme.colors.xp];
  CHARACTERS.forEach((c, ci) => {
    const x = 18;
    const cw = w - 36;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    fillRoundRect(x, y, cw, cardH, 16);
    ctx.strokeStyle = 'rgba(255,208,138,0.35)';
    ctx.lineWidth = 1;
    strokeRoundRect(x, y, cw, cardH, 16);

    // 头像色块（小游戏环境没有 DOM 图片，先用色块占位）
    ctx.fillStyle = tints[ci % tints.length];
    ctx.beginPath();
    ctx.arc(x + 36, y + cardH / 2, 20, 0, Math.PI * 2);
    ctx.fill();

    text(c.name, x + 70, y + cardH * 0.3, 19, theme.colors.text, 'left', '700');
    text(c.desc || c.trait || '', x + 70, y + cardH * 0.58, 11, 'rgba(251,243,232,0.62)');

    button(x + cw - 96, y + cardH / 2 - 20, 80, 40, '出战', 'startRun', c.id, { size: 15 });
    y += cardH + 10;
  });
  button(w * 0.2, h - 78, w * 0.6, 46, '返回', 'backMenu', null);
}

function drawHud(snap) {
  const w = view.width;
  const top = 12;

  // 顶部条
  ctx.fillStyle = 'rgba(19,17,32,0.6)';
  fillRoundRect(10, top, w - 20, 50, 14);
  text(`第 ${snap.wave}/${snap.totalWaves} 波`, 22, top + 18, 15, theme.colors.text, 'left', '700');
  text(snap.bossWave ? '讨伐目标' : snap.waveName || '', 22, top + 36, 11, 'rgba(251,243,232,0.6)');
  text(`金币 ${snap.money}`, w - 86, top + 25, 13, theme.colors.coin, 'right', '700');
  button(w - 62, top + 10, 44, 30, snap.mode === 'paused' ? '继续' : '暂停', 'togglePause', null, { size: 12 });

  // HP
  const barX = 14;
  let barY = top + 60;
  const barW = w - 28;
  ctx.fillStyle = theme.colors.hpBack;
  fillRoundRect(barX, barY, barW, 14, 7);
  ctx.fillStyle = theme.colors.hp;
  fillRoundRect(barX, barY, Math.max(0, barW * (snap.hp / snap.maxHp)), 14, 7);
  text(`${snap.hp}/${snap.maxHp}`, barX + 8, barY + 7, 10, '#fff', 'left', '700');

  // XP
  barY += 20;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  fillRoundRect(barX, barY, barW, 9, 4);
  ctx.fillStyle = theme.colors.xp;
  fillRoundRect(barX, barY, Math.max(0, barW * (snap.xp / snap.xpNext)), 9, 4);
  text(`Lv.${snap.level}`, w - 16, barY + 5, 10, 'rgba(255,255,255,0.85)', 'right', '700');

  // 讨伐目标血条
  if (snap.boss) {
    barY += 18;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    fillRoundRect(barX, barY, barW, 10, 5);
    ctx.fillStyle = theme.colors.danger;
    fillRoundRect(barX, barY, Math.max(0, barW * (snap.boss.hp / snap.boss.maxHp)), 10, 5);
    text(`讨伐目标 · ${snap.boss.name}`, w / 2, barY - 8, 12, theme.colors.danger, 'center', '700');
  }

  // 装备栏
  const chips = snap.weapons.slice(0, 6);
  const chipW = Math.min(96, (w - 28) / Math.max(1, chips.length) - 6);
  chips.forEach((wp, i) => {
    const x = 14 + i * (chipW + 6);
    const y = view.height - 34;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    fillRoundRect(x, y, chipW, 24, 8);
    text(`${wp.name}`, x + chipW / 2, y + 9, 10, theme.colors.text, 'center', '600');
    text(`Lv.${wp.level}`, x + chipW / 2, y + 19, 8, 'rgba(251,243,232,0.55)', 'center');
  });
}

function drawLevelUp(snap) {
  const w = view.width;
  const h = view.height;
  ctx.fillStyle = 'rgba(13,11,23,0.8)';
  ctx.fillRect(0, 0, w, h);
  text('成长！三选一', w / 2, 62, 26, theme.colors.text, 'center', '800');
  text('点击卡片选择', w / 2, 92, 13, 'rgba(251,243,232,0.6)', 'center');

  const options = snap.upgradeOptions || [];
  const cardH = Math.min(112, (h - 170) / Math.max(1, options.length) - 12);
  let y = 116;
  options.forEach((opt, i) => {
    const x = 18;
    const cw = w - 36;
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    fillRoundRect(x, y, cw, cardH, 16);
    ctx.strokeStyle = opt.rarity >= 3 ? theme.colors.accent2 : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = opt.rarity >= 3 ? 2 : 1;
    strokeRoundRect(x, y, cw, cardH, 16);
    text(opt.name, x + 16, y + 30, 19, theme.colors.text, 'left', '700');
    text(opt.mods?.[0] || '', x + 16, y + 54, 13, theme.colors.accent);
    text(opt.flavor || '', x + 16, y + cardH - 20, 11, 'rgba(251,243,232,0.5)');
    text(`1-${i + 1}`, x + cw - 18, y + 24, 11, 'rgba(251,243,232,0.35)', 'right');
    ui.hits.push({ x, y, w: cw, h: cardH, action: 'upgrade', payload: i });
    y += cardH + 12;
  });
}

function drawShop(snap) {
  const w = view.width;
  const h = view.height;
  ctx.fillStyle = 'rgba(13,11,23,0.84)';
  ctx.fillRect(0, 0, w, h);
  text('路边补给点', w / 2, 48, 26, theme.colors.text, 'center', '800');
  text(`金币 ${snap.money} · 第 ${snap.wave} 波结束`, w / 2, 76, 13, theme.colors.coin, 'center');

  const offers = snap.shop?.offers || [];
  const rowH = Math.min(88, (h - 260) / Math.max(1, offers.length) - 8);
  let y = 96;
  offers.forEach((offer, i) => {
    const x = 14;
    const cw = w - 28;
    ctx.fillStyle = offer.sold ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)';
    fillRoundRect(x, y, cw, rowH, 14);
    ctx.strokeStyle = offer.sold ? 'rgba(255,255,255,0.06)' : offer.rarity >= 3 ? theme.colors.accent2 : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    strokeRoundRect(x, y, cw, rowH, 14);

    text(offer.name, x + 14, y + 24, 17, offer.sold ? 'rgba(255,255,255,0.35)' : theme.colors.text, 'left', '700');
    text(offer.tag || '', x + 14, y + 46, 11, 'rgba(251,243,232,0.55)');
    text(offer.desc || offer.mods || '', x + 14, y + rowH - 18, 10, 'rgba(251,243,232,0.45)');

    if (offer.sold) {
      text('已买', x + cw - 16, y + rowH / 2, 14, 'rgba(255,255,255,0.35)', 'right', '600');
    } else {
      button(x + cw - 92, y + rowH / 2 - 20, 80, 40, `金币 ${offer.price}`, 'buy', i, {
        disabled: !offer.canBuy,
        size: 14,
      });
    }
    y += rowH + 8;
  });

  const healPrice = snap.shop?.healPrice ?? 0;
  const canHeal = snap.hp < snap.maxHp && snap.money >= healPrice;
  button(14, h - 118, (w - 42) / 2, 44, `喝碗热汤 ${healPrice}`, 'heal', null, { disabled: !canHeal, size: 13 });
  button(w / 2 + 7, h - 118, (w - 42) / 2, 44, `换一批 ${snap.shop?.rerollCost ?? 0}`, 'reroll', null, {
    disabled: snap.money < (snap.shop?.rerollCost ?? 0),
    size: 13,
  });
  button(14, h - 64, w - 28, 48, '继续赶路 →', 'nextWave', null, { primary: true });
}

function drawPaused() {
  const w = view.width;
  const h = view.height;
  ctx.fillStyle = 'rgba(13,11,23,0.74)';
  ctx.fillRect(0, 0, w, h);
  text('暂停', w / 2, h * 0.36, 32, theme.colors.text, 'center', '800');
  text('先歇一会儿，委托还没结束。', w / 2, h * 0.41, 13, 'rgba(251,243,232,0.55)', 'center');
  button(w * 0.2, h * 0.46, w * 0.6, 52, '继续', 'togglePause', null, { primary: true });
  button(w * 0.2, h * 0.55, w * 0.6, 46, '回主菜单', 'quitMenu', null);
}

function drawResult(snap) {
  const w = view.width;
  const h = view.height;
  drawBackdrop();
  const victory = snap.result?.victory;
  const payout = snap.result?.payout || { total: snap.result?.money ?? 0 };
  const character = CHARACTERS.find((c) => c.id === (snap.result?.characterId || snap.character?.id));
  text(victory ? '委托完成' : '委托中止', w / 2, h * 0.24, 38, victory ? theme.colors.accent : theme.colors.danger, 'center', '800');
  text(victory ? `讨伐成功 · 报酬 +${payout.total}` : `抵达第 ${snap.result?.wave ?? snap.wave} 波`, w / 2, h * 0.31, 15, 'rgba(251,243,232,0.7)', 'center');

  const rows = [
    ['搭档', character?.name || '-'],
    ['波次', `${snap.result?.wave ?? snap.wave}/${snap.totalWaves}`],
    ['等级', snap.result?.level ?? snap.level],
    ['击退', snap.result?.kills ?? snap.kills],
    ['报酬', payout.total],
    ['用时', `${Math.round(snap.result?.time ?? 0)} 秒`],
  ];
  let y = h * 0.38;
  for (const [k, v] of rows) {
    text(k, w * 0.2, y, 14, 'rgba(251,243,232,0.55)');
    text(v, w * 0.8, y, 15, theme.colors.text, 'right', '600');
    y += 30;
  }
  button(w * 0.14, h - 150, w * 0.72, 52, '再接一单', 'restart', null, { primary: true });
  button(w * 0.14, h - 88, w * 0.72, 44, '回主菜单', 'quitMenu', null);
}

/* ---------------- 主循环 ---------------- */

let last = platform.now();

function draw() {
  const snap = game.getSnapshot();
  ui.hits = [];
  setDprTransform();

  if (ui.screen === 'menu') {
    drawMenu();
  } else if (ui.screen === 'help') {
    drawHelp();
  } else if (ui.screen === 'char') {
    drawCharSelect();
  } else {
    // run
    renderer.draw(game.world, theme, null);
    drawHud(snap);

    if (snap.mode === 'levelup') drawLevelUp(snap);
    else if (snap.mode === 'shop') drawShop(snap);
    else if (snap.mode === 'paused') drawPaused();
    else if (snap.mode === 'result') drawResult(snap);
  }

  if (ui.messageT > 0) {
    text(ui.message, view.width / 2, view.height * 0.5, 14, theme.colors.accent, 'center', '700');
  }
}

function tick() {
  const now = platform.now();
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;

  if (ui.screen === 'run') {
    game.update(dt);
    const snap = game.getSnapshot();
    if (snap.mode === 'result' && !ui.savedResult) {
      ui.savedResult = true;
      const next = {
        bestWave: Math.max(meta.bestWave || 0, snap.result?.wave || snap.wave || 0),
        runs: (meta.runs || 0) + 1,
        wins: (meta.wins || 0) + (snap.result?.victory ? 1 : 0),
      };
      Object.assign(meta, next);
      saveMeta(next);
    }
  }

  if (ui.messageT > 0) ui.messageT -= 1;

  draw();
  platform.requestFrame(tick);
}

/* ---------------- 输入 ---------------- */

function onDown(x, y) {
  const tapped = hit(ui.hits, x, y);
  if (tapped) {
    handleAction(tapped.action, tapped.payload);
    return;
  }

  if (ui.screen === 'run') {
    const snap = game.getSnapshot();
    if (snap.mode !== 'battle') return;
    ui.joy.active = true;
    ui.joy.ox = x;
    ui.joy.oy = y;
    ui.joy.x = x;
    ui.joy.y = y;
    updateMove();
  }
}

function onMove(x, y) {
  if (!ui.joy.active) return;
  ui.joy.x = x;
  ui.joy.y = y;
  updateMove();
}

function onUp() {
  ui.joy.active = false;
  if (game.world) {
    game.world.player.moveX = 0;
    game.world.player.moveY = 0;
  }
}

function updateMove() {
  const dx = ui.joy.x - ui.joy.ox;
  const dy = ui.joy.y - ui.joy.oy;
  const len = Math.hypot(dx, dy);
  const max = 62;
  const k = len > max ? max / len : 1;
  const nx = (dx * k) / max;
  const ny = (dy * k) / max;
  if (game.world) {
    game.world.player.moveX = Math.abs(nx) > 0.08 ? nx : 0;
    game.world.player.moveY = Math.abs(ny) > 0.08 ? ny : 0;
  }
}

function handleAction(action, payload) {
  switch (action) {
    case 'goChar':
      ui.screen = 'char';
      break;
    case 'help':
      ui.screen = 'help';
      break;
    case 'backMenu':
      ui.screen = 'menu';
      break;
    case 'startRun':
      ui.screen = 'run';
      ui.savedResult = false;
      game.startRun(payload);
      break;
    case 'togglePause':
      if (game.mode === 'paused') game.resume();
      else game.pause();
      break;
    case 'upgrade':
      game.chooseUpgrade(payload);
      break;
    case 'buy': {
      const res = game.buy(payload);
      if (!res || !res.ok) flash('金币不够 / 装备栏已满');
      break;
    }
    case 'heal': {
      const res = game.heal();
      if (!res || !res.ok) flash('金币不够，或者现在不累');
      break;
    }
    case 'reroll': {
      const res = game.reroll();
      if (!res || !res.ok) flash('金币不足');
      break;
    }
    case 'nextWave':
      game.nextWave();
      break;
    case 'restart':
      ui.savedResult = false;
      game.restart();
      break;
    case 'quitMenu':
      game.quit();
      ui.screen = 'menu';
      ui.savedResult = false;
      break;
    default:
      break;
  }
}

function flash(msg) {
  ui.message = msg;
  ui.messageT = 60;
}

platform.bindPointer(canvas, {
  down: (p) => onDown(p.x, p.y),
  move: (p) => onMove(p.x, p.y),
  up: () => onUp(),
});

platform.bindVisibility((hidden) => {
  if (hidden && game.mode === 'battle') game.pause();
});

tick();
