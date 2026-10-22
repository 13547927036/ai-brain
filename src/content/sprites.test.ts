import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_SPRITES, getSprite, spriteKeys } from './sprites.js';
import { CHIIKAWA_PLACEHOLDER, getTheme } from './theme.js';

test('三个可玩角色都有贴图，且都带受击图', () => {
  for (const key of ['player_hachiware', 'player_chiikawa', 'player_usagi']) {
    const ref = getSprite(key);
    assert.ok(ref, `${key} 未登记`);
    assert.ok(ref.normal.endsWith('.png'), `${key} normal 不是 png`);
    assert.ok(ref.hit && ref.hit.endsWith('.png'), `${key} 缺受击图`);
  }
});

test('贴图路径不带前导斜杠，浏览器与微信都能用相对路径解析', () => {
  for (const key of spriteKeys()) {
    const ref = CHARACTER_SPRITES[key];
    assert.ok(ref);
    assert.ok(!ref.normal.startsWith('/'), `${key} normal 有前导斜杠`);
    assert.ok(!ref.hit!.startsWith('/'), `${key} hit 有前导斜杠`);
  }
});

test('常态图与受击图指向不同文件', () => {
  for (const key of spriteKeys()) {
    const ref = CHARACTER_SPRITES[key]!;
    assert.notEqual(ref.normal, ref.hit, `${key} 的受击图与常态图相同`);
  }
});

test('主题里的玩家贴图键都能在资源表里查到', () => {
  const sprites = CHIIKAWA_PLACEHOLDER.sprites;
  assert.ok(sprites, '占位主题没有贴图');
  for (const appearanceKey of ['player_hachiware', 'player_chiikawa', 'player_usagi']) {
    assert.ok(sprites[appearanceKey], `主题缺少 ${appearanceKey}`);
  }
});

test('取不到的角色返回 undefined，不抛错', () => {
  assert.equal(getSprite('not_a_real_key'), undefined);
});

test('原创皮肤不挂贴图，回退几何图形', () => {
  const skin = getTheme('originalSkin');
  assert.equal(skin.sprites, undefined);
});