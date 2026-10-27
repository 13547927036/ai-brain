import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHARACTERS } from '../src/content/characters.js';
import { ENEMY_LIST, BOSSES } from '../src/content/enemies.js';
import { WAVES } from '../src/content/waves.js';
import { WEAPON_LIST } from '../src/content/weapons.js';
import { ITEMS } from '../src/content/items.js';
import { UPGRADES } from '../src/content/upgrades.js';
import { COMMISSIONS } from '../src/content/commissions.js';
import { ITEM_ICONS, WEAPON_ICONS, getSprite } from '../src/content/assets.js';

/** 玩家能看到的文本字段；内部 id / 代码注释不参与检查。 */
function userFacingCopy() {
  const rows = [];
  const add = (where, value) => {
    if (typeof value === 'string' && value.trim()) rows.push(`${where}: ${value}`);
  };

  for (const c of CHARACTERS) {
    add(`角色 ${c.id} 名称`, c.name);
    add(`角色 ${c.id} 描述`, c.title);
    add(`角色 ${c.id} 详情`, c.desc);
  }
  for (const e of [...ENEMY_LIST, ...Object.values(BOSSES)]) {
    add(`敌人 ${e.id} 名称`, e.name);
    add(`敌人 ${e.id} 描述`, e.desc);
    add(`敌人 ${e.id} 标签`, e.title);
  }
  for (const w of WAVES) add(`第 ${w.n} 波`, w.name);
  for (const w of WEAPON_LIST) {
    add(`装备 ${w.id} 名称`, w.name);
    add(`装备 ${w.id} 描述`, w.desc);
  }
  for (const item of ITEMS) {
    add(`用品 ${item.id} 名称`, item.name);
    add(`用品 ${item.id} 描述`, item.desc);
  }
  for (const u of UPGRADES) {
    add(`成长 ${u.id} 名称`, u.name);
    add(`成长 ${u.id} 描述`, u.desc);
    add(`成长 ${u.id} 风味`, u.flavor);
  }
  for (const c of Object.values(COMMISSIONS)) {
    add(`委托 ${c.id} 名称`, c.name);
    add(`委托 ${c.id} 委托方`, c.client);
    add(`委托 ${c.id} 地点`, c.area);
    add(`委托 ${c.id} 简报`, c.brief);
  }
  return rows;
}

test('玩家可见文案不再残留旧题材关键词', () => {
  const banned = ['吸尘', '清洁', '清扫', '灰尘', '扫地机', '哈气', '铁肺', '霓虹', '纸片白日', '首领', '武器', '商店', '治疗', '维修'];
  const rows = userFacingCopy();
  for (const row of rows) {
    for (const word of banned) {
      assert.equal(row.includes(word), false, `旧题材关键词「${word}」仍出现在 ${row}`);
    }
  }
  assert.equal(rows.some((row) => row.includes('猫')), false, '玩家可见文案仍出现「猫」');
});

test('每个装备与用品都有独立图标，且图标 sprite 已注册', () => {
  for (const w of WEAPON_LIST) {
    const spriteId = WEAPON_ICONS[w.id];
    assert.ok(spriteId, `${w.name} 缺少图标映射`);
    assert.equal(getSprite(spriteId).kind, 'glyph', `${w.name} 的图标 ${spriteId} 不是 glyph`);
  }
  for (const item of ITEMS) {
    const spriteId = ITEM_ICONS[item.id];
    assert.ok(spriteId, `${item.name} 缺少图标映射`);
    assert.equal(getSprite(spriteId).kind, 'glyph', `${item.name} 的图标 ${spriteId} 不是 glyph`);
  }
  const icons = [
    ...WEAPON_LIST.map((w) => WEAPON_ICONS[w.id]),
    ...ITEMS.map((item) => ITEM_ICONS[item.id]),
  ];
  assert.equal(new Set(icons).size, icons.length, '装备与用品不应共用同一个图标');
});

test('README 与页面都明确标注非官方同人，不声称已获授权', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(readme, /非官方同人作品/);
  assert.match(readme, /未获得《Chiikawa》/);
  assert.match(index, /非官方/);
  assert.equal(/已获得.*授权|官方授权/.test(readme), false, 'README 不应声称已获得官方授权');
  assert.equal(readme.includes('哈气猫'), false, 'README 仍残留旧标题');
});
