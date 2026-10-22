import { CHARACTERS } from '../content/characters.js';
import { ITEM_BY_ID } from '../content/items.js';
import type { ThemeDef } from '../content/theme.js';
import type { CharacterDef, WeaponDef } from '../content/types.js';
import { WEAPON_BY_ID } from '../content/weapons.js';
/** 角色描述从规则字段生成，保证描述与数值永远一致 */
function charDesc(c: CharacterDef): string {
  const parts: string[] = [];
  if (c.hpMul !== 1) parts.push(`生命 ${c.hpMul > 1 ? '+' : ''}${Math.round((c.hpMul - 1) * 100)}%`);
  if (c.luckMul !== 1) parts.push(`幸运获取 +${Math.round((c.luckMul - 1) * 100)}%`);
  if (c.attackSpeedMul !== 1) parts.push(`攻速获取 +${Math.round((c.attackSpeedMul - 1) * 100)}%`);
  if (c.materialXpMul !== 1) parts.push(`材料/经验 +${Math.round((c.materialXpMul - 1) * 100)}%`);
  if (c.armorLocked) parts.push('无法获得护甲');
  return parts.join('，') || '均衡';
}

function weaponDesc(d: WeaponDef): string {
  const kind = d.kind === 'melee' ? '近战' : '远程';
  return `${kind} · 伤害 ${d.damage} · 冷却 ${d.cooldown}s · 射程 ${d.range}`;
}
import type { Run } from '../core/run.js';
import { rerollCost } from '../core/shop.js';
import type { UpgradeTier } from '../core/upgrade.js';
import { drawHud, type Rect, type UI } from './ui.js';

const TIER_COLOR: Record<UpgradeTier, string> = {
  common: '#8ecae6',
  uncommon: '#06d6a0',
  rare: '#ffd166',
};

const TIER_NAME: Record<UpgradeTier, string> = {
  common: '普通',
  uncommon: '优良',
  rare: '稀有',
};

function backdrop(ui: UI, alpha: number): void {
  ui.rect({ x: 0, y: 0, w: 750, h: 1334 }, `rgba(8,8,12,${alpha})`);
}

function card(ui: UI, r: Rect, fill = '#1f2430', stroke = '#3a4150'): void {
  ui.rect(r, fill, stroke, 3);
}

/** 商店：4 货位 + 重掷 + 开始下一波 */
export function drawShop(ui: UI, run: Run, theme: ThemeDef): void {
  const w = run.world;
  const shop = run.shop;
  drawHud(ui, w, theme);
  backdrop(ui, 0.86);

  ui.label('商 店', 375, 74, 44, theme.palette.text, 'center', 'bold');
  ui.label(`第 ${shop ? shop.wave : w.wave.index} 波准备`, 375, 116, 22, '#8b93a7', 'center');
  ui.label(`材料 ${Math.floor(w.player.materials)}`, 375, 152, 26, theme.palette.material, 'center', 'bold');

  if (shop) {
    for (let i = 0; i < shop.slots.length; i++) {
      const slot = shop.slots[i];
      if (!slot) continue;
      const y = 200 + i * 168;
      const r: Rect = { x: 40, y, w: 670, h: 148 };
      const affordable = w.player.materials >= slot.price && !slot.sold;

      card(ui, r, slot.sold ? '#16181d' : '#1f2430', slot.locked ? '#ffd166' : '#3a4150');

      if (slot.kind === 'weapon') {
        const def = WEAPON_BY_ID[slot.contentId];
        ui.label(def ? def.name : slot.contentId, 68, y + 42, 30, slot.sold ? '#5a5f6b' : theme.palette.text, 'left', 'bold');
        ui.label(`武器 · T${slot.quality}`, 68, y + 80, 20, '#8ecae6', 'left');
        ui.label(def ? weaponDesc(def) : '', 68, y + 112, 18, '#8b93a7', 'left');
      } else {
        const def = ITEM_BY_ID[slot.contentId];
        ui.label(def ? def.name : slot.contentId, 68, y + 42, 30, slot.sold ? '#5a5f6b' : theme.palette.text, 'left', 'bold');
        ui.label('道具', 68, y + 80, 20, '#06d6a0', 'left');
        ui.label(def ? def.desc : '', 68, y + 112, 18, '#8b93a7', 'left');
      }

      if (slot.sold) {
        ui.label('已售出', 600, y + 74, 26, '#5a5f6b', 'center', 'bold');
      } else {
        ui.button(`buy:${i}`, { x: 500, y: y + 30, w: 180, h: 48 }, `${slot.price} 材料`, {
          enabled: affordable,
          fill: affordable ? '#2d6a4f' : '#22252c',
        });
        ui.button(`lock:${i}`, { x: 500, y: y + 88, w: 180, h: 40 }, slot.locked ? '已锁定' : '锁定', {
          fill: slot.locked ? '#7f5539' : '#2f3542',
          size: 20,
        });
      }
    }

    const canReroll = w.player.materials >= rerollCost(shop);
    ui.button('reroll', { x: 40, y: 900, w: 320, h: 76 }, `重掷 (${rerollCost(shop)})`, {
      enabled: canReroll,
      fill: canReroll ? '#3d5a80' : '#22252c',
      size: 28,
    });
  }

  ui.button('nextWave', { x: 390, y: 900, w: 320, h: 76 }, '开始下一波', {
    fill: '#2d6a4f',
    size: 30,
  });
}

/** 升级三选一 */
export function drawLevelUp(ui: UI, run: Run, theme: ThemeDef): void {
  drawHud(ui, run.world, theme);
  backdrop(ui, 0.88);

  ui.label('升 级 ！', 375, 84, 44, theme.palette.xpOrb, 'center', 'bold');
  ui.label('选择一项强化', 375, 126, 22, '#8b93a7', 'center');
  const remain = run.world.player.pendingLevelUps;
  if (remain > 1) ui.label(`还有 ${remain} 次`, 375, 160, 20, '#ffd166', 'center');

  for (let i = 0; i < run.choices.length; i++) {
    const c = run.choices[i];
    if (!c) continue;
    const y = 210 + i * 220;
    const r: Rect = { x: 50, y, w: 650, h: 190 };
    card(ui, r, '#1f2430', TIER_COLOR[c.tier]);
    ui.label(c.label, 90, y + 56, 36, theme.palette.text, 'left', 'bold');
    ui.label(`+${c.amount}`, 90, y + 112, 40, TIER_COLOR[c.tier], 'left', 'bold');
    ui.label(`${TIER_NAME[c.tier]}${c.isSub ? ' · 副属性' : ''}`, 660, y + 50, 22, TIER_COLOR[c.tier], 'right');
    ui.button(`pick:${i}`, { x: 90, y: y + 138, w: 570, h: 44 }, '选择', { fill: '#2d6a4f', size: 24 });
  }
}

/** 胜利 / 失败 */
export function drawEnd(ui: UI, run: Run, theme: ThemeDef, victory: boolean): void {
  backdrop(ui, 0.92);
  const p = run.world.player;

  ui.label(victory ? '通 关 ！' : '阵 亡', 375, 300, 60, victory ? theme.palette.xpOrb : theme.palette.danger, 'center', 'bold');
  ui.label(`${run.character.name}`, 375, 372, 26, '#8b93a7', 'center');

  const rows: Array<[string, string]> = [
    ['到达波次', `第 ${run.world.wave.index} 波`],
    ['等级', `Lv.${p.level}`],
    ['武器', `${p.weapons.length} / ${p.weaponSlots}`],
    ['材料', `${Math.floor(p.materials)}`],
  ];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const y = 460 + i * 56;
    ui.label(row[0], 200, y, 26, '#8b93a7', 'left');
    ui.label(row[1], 550, y, 26, theme.palette.text, 'right', 'bold');
  }

  ui.button('restart', { x: 200, y: 760, w: 350, h: 88 }, '再来一局', { fill: '#2d6a4f', size: 32 });
}

/** 角色 id -> 立绘。没加载到就返回 null，卡片退化为纯文字 */
export type PortraitLookup = (characterId: string) => CanvasImageSource | null;

/** 选角色 */
export function drawCharacterSelect(
  ui: UI,
  theme: ThemeDef,
  hasSave = false,
  portrait?: PortraitLookup,
): void {
  backdrop(ui, 0.94);
  ui.label('哈 气 猫', 375, 110, 48, theme.palette.text, 'center', 'bold');
  ui.label('选择角色', 375, 164, 24, '#8b93a7', 'center');

  if (hasSave) {
    ui.button('resume', { x: 150, y: 990, w: 450, h: 86 }, '继续上次进度', { fill: '#3d5a80', size: 30 });
  }

  for (let i = 0; i < CHARACTERS.length; i++) {
    const c = CHARACTERS[i];
    if (!c) continue;
    const y = 220 + i * 250;
    const r: Rect = { x: 50, y, w: 650, h: 220 };
    card(ui, r, '#1f2430', '#3a4150');
    const face = portrait?.(c.id) ?? null;
    if (face) ui.image(face, r.x + r.w - 78, y + 92, 124);
    ui.label(c.name, 90, y + 50, 34, theme.palette.text, 'left', 'bold');
    ui.label(charDesc(c), 90, y + 96, 18, '#8b93a7', 'left');
    ui.label(`生命 ${Math.round(60 * c.hpMul)} · 武器槽 ${c.weaponSlots}`, 90, y + 132, 18, '#8ecae6', 'left');
    ui.button(`char:${c.id}`, { x: 90, y: y + 160, w: 570, h: 44 }, '选择', { fill: '#2d6a4f', size: 24 });
  }
}
