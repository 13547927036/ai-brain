import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHIIKAWA_PLACEHOLDER,
  DEFAULT_THEME_ID,
  THEMES,
  getTheme,
  themeIds,
  type ThemePalette,
} from './theme.js';

/**
 * 验证「主题层完全数据驱动」不是一句声明。
 *
 * 关键点：换皮要能真的换掉 —— 如果第二个主题缺色板键，渲染时拿到
 * undefined 会画出透明/黑色，那种"能跑但画面错"最难发现，必须在测试里挡住。
 */

const PALETTE_KEYS: Array<keyof ThemePalette> = [
  'bg', 'arenaBorder', 'player', 'enemy', 'enemyFast', 'enemyRanged',
  'boss', 'xpOrb', 'material', 'heal', 'text', 'danger',
];

test('注册表至少有两个主题，否则"可换皮"无法验证', () => {
  assert.ok(themeIds().length >= 2, `实际注册了 ${themeIds().length} 个主题`);
});

test('默认主题 id 存在于注册表中', () => {
  assert.ok(THEMES[DEFAULT_THEME_ID], `默认 id ${DEFAULT_THEME_ID} 未注册`);
});

test('每个主题的色板键完整且非空', () => {
  for (const id of themeIds()) {
    const t = THEMES[id];
    assert.ok(t, `主题 ${id} 取不到`);
    for (const key of PALETTE_KEYS) {
      const v = t.palette[key];
      assert.ok(
        typeof v === 'string' && v.length > 0,
        `主题 ${id} 缺少色板键 ${key}（实际 ${JSON.stringify(v)}）`,
      );
    }
  }
});

test('每个主题的 appearanceKeys 键集合与默认主题一致', () => {
  const expected = Object.keys(CHIIKAWA_PLACEHOLDER.appearanceKeys).sort();
  for (const id of themeIds()) {
    const t = THEMES[id];
    assert.ok(t);
    const actual = Object.keys(t.appearanceKeys).sort();
    assert.deepEqual(actual, expected, `主题 ${id} 的 appearanceKeys 键集不一致，换皮会漏图`);
  }
});

test('两个主题的色板确实不同（否则换皮不可见）', () => {
  const ids = themeIds();
  assert.ok(ids.length >= 2);
  const a = THEMES[ids[0] ?? ''];
  const b = THEMES[ids[1] ?? ''];
  assert.ok(a && b);
  const diff = PALETTE_KEYS.filter((k) => a.palette[k] !== b.palette[k]);
  assert.ok(diff.length >= 6, `两个主题只有 ${diff.length} 个键不同，换皮效果不明显`);
});

test('getTheme 缺省返回默认主题', () => {
  assert.equal(getTheme().id, DEFAULT_THEME_ID);
  assert.equal(getTheme(null).id, DEFAULT_THEME_ID);
  assert.equal(getTheme(undefined).id, DEFAULT_THEME_ID);
});

test('getTheme 未知 id 回退默认，不抛错也不返回 undefined', () => {
  const t = getTheme('不存在的皮肤');
  assert.equal(t.id, DEFAULT_THEME_ID);
  assert.equal(t, CHIIKAWA_PLACEHOLDER);
});

test('getTheme 能取到第二个主题（换皮真的能切）', () => {
  const ids = themeIds().filter((id) => id !== DEFAULT_THEME_ID);
  assert.ok(ids.length > 0, '没有非默认主题');
  const t = getTheme(ids[0]);
  assert.equal(t.id, ids[0]);
  assert.notEqual(t.id, DEFAULT_THEME_ID);
});

test('占位主题被标记为 placeholder，原创皮肤不是', () => {
  assert.equal(CHIIKAWA_PLACEHOLDER.placeholder, true, 'Chiikawa 占位必须标记为不可发布');
  for (const id of themeIds()) {
    const t = THEMES[id];
    assert.ok(t);
    if (t.id !== CHIIKAWA_PLACEHOLDER.id) {
      assert.equal(t.placeholder, false, `非占位主题 ${id} 不应标记 placeholder`);
    }
  }
});
