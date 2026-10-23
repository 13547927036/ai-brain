import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHARACTERS, CHARACTER_BY_ID, getCharacter } from '../src/content/characters.js';
import { SPRITES, getSprite } from '../src/content/assets.js';
import { getWeapon } from '../src/content/weapons.js';
import { createWorld } from '../src/game/world.js';

/** 三个主角：标识、名称、图片必须一一对应，错一处就算失败。 */
const EXPECTED = [
  { id: 'hachiware', name: '小八', image: './chars/hachiware.png' },
  { id: 'chiikawa', name: '吉伊', image: './chars/chiikawa.png' },
  { id: 'usagi', name: '乌萨奇', image: './chars/usagi.png' },
];
const EXPECTED_IDS = EXPECTED.map((e) => e.id);

/** 原图实体内容尺寸，用于核对素材是否等比导出（未被拉伸变形）。 */
const SRC = { hachiware: [812, 533], chiikawa: [844, 511], usagi: [822, 739] };
const REF_W = 844;
const REF_OUT = 192;

function publicUrl(image) {
  return new URL('../public/' + image.replace(/^\.\//, ''), import.meta.url);
}

/** 读 PNG 的 IHDR：宽高、位深、颜色类型（6 = RGBA）。 */
function readPngHeader(image) {
  const buf = readFileSync(publicUrl(image));
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < sig.length; i += 1) assert.equal(buf[i], sig[i], 'PNG 签名不正确');
  assert.equal(buf.toString('ascii', 12, 16), 'IHDR');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bitDepth: buf[24],
    colorType: buf[25],
    bytes: buf.length,
  };
}

test('可玩角色恰好三个', () => {
  assert.equal(CHARACTERS.length, 3);
  assert.equal(Object.keys(CHARACTER_BY_ID).length, 3);
});

test('角色标识与保留名单一致，已移除的影丸不再存在', () => {
  assert.deepEqual(CHARACTERS.map((c) => c.id), EXPECTED_IDS);
  assert.equal(CHARACTER_BY_ID.shadow, undefined);
  assert.equal(CHARACTERS.some((c) => c.id === 'shadow'), false);
});

test('角色数据不含解锁字段，解锁机制已整体移除', () => {
  for (const c of CHARACTERS) {
    assert.equal('unlock' in c, false, `${c.id} 仍带有解锁字段`);
  }
});

test('三个角色的标识、名称与图片一一对应，不会错位', () => {
  assert.deepEqual(CHARACTERS.map((c) => c.name), EXPECTED.map((e) => e.name));
  for (const e of EXPECTED) {
    const c = CHARACTER_BY_ID[e.id];
    assert.ok(c, `${e.id} 不存在`);
    assert.equal(c.sprite, `cat.${e.id}`);
    const sprite = getSprite(c.sprite);
    assert.ok(sprite, `${c.name} 的精灵 ${c.sprite} 未注册`);
    assert.equal(sprite.kind, 'image', `${c.name} 应使用图片素材`);
    assert.equal(sprite.image, e.image, `${c.name} 绑定的图片与名称不匹配`);
  }
  const images = EXPECTED.map((e) => SPRITES[`cat.${e.id}`].image);
  assert.equal(new Set(images).size, 3, '三个角色不能共用同一张图片');
});

test('三个角色的描述与当前形象一致，旧设定文案已清除', () => {
  const TITLES = {
    hachiware: '温柔可靠的日常搭档',
    chiikawa: '有点胆小却努力的冒险家',
    usagi: '精力充沛的自由行动派',
  };
  const STALE = ['巷口的老大', '屋顶的影子', '冷柜上的白猫'];
  for (const e of EXPECTED) {
    const c = CHARACTER_BY_ID[e.id];
    assert.equal(c.title, TITLES[e.id], `${c.name} 的角色描述不符`);
    assert.ok(c.title.length >= 4 && c.title.length <= 12, `${c.name} 描述长度异常：${c.title.length}`);
    assert.equal(STALE.includes(c.title), false, `${c.name} 仍在使用旧描述`);
    assert.ok(c.desc && c.desc.length > 0, `${c.name} 缺少详细说明`);
  }
  const titles = EXPECTED.map((e) => CHARACTER_BY_ID[e.id].title);
  assert.equal(new Set(titles).size, 3, '三个角色的描述不能重复');
  assert.equal(CHARACTERS.some((c) => STALE.includes(c.title)), false, '存在旧描述残留');
});

test('角色位图恰好三个，且没有残留其它猫素材', () => {
  const cats = Object.keys(SPRITES).filter((k) => k.startsWith('cat.'));
  assert.deepEqual(cats.sort(), EXPECTED_IDS.map((id) => 'cat.' + id).sort());
  assert.equal(SPRITES['cat.shadow'], undefined);
  assert.equal(SPRITES['cat.ginger'], undefined);
  assert.equal(SPRITES['cat.soot'], undefined);
  assert.equal(SPRITES['cat.frost'], undefined);
});

test('三张角色图片都存在、是带透明通道的 PNG', () => {
  for (const e of EXPECTED) {
    const h = readPngHeader(e.image);
    assert.equal(h.bitDepth, 8, `${e.name} 位深应为 8`);
    assert.equal(h.colorType, 6, `${e.name} 应保留透明背景（RGBA）`);
    assert.ok(h.bytes > 4096, `${e.name} 文件异常小：${h.bytes} 字节`);
  }
});

test('三张图片按同一系数等比导出，没有被拉伸变形', () => {
  for (const e of EXPECTED) {
    const h = readPngHeader(e.image);
    const [sw, sh] = SRC[e.id];
    assert.equal(h.width, Math.round((sw * REF_OUT) / REF_W), `${e.name} 宽度比例不符`);
    assert.equal(h.height, Math.round((sh * REF_OUT) / REF_W), `${e.name} 高度比例不符`);
    const srcRatio = sw / sh;
    const outRatio = h.width / h.height;
    assert.ok(
      Math.abs(srcRatio - outRatio) / srcRatio < 0.01,
      `${e.name} 宽高比被改变：${srcRatio.toFixed(3)} -> ${outRatio.toFixed(3)}`,
    );
  }
});

test('每个角色的起始武器都存在', () => {
  for (const c of CHARACTERS) {
    assert.ok(getWeapon(c.startWeapon), `${c.id} 的起始武器 ${c.startWeapon} 不存在`);
  }
});

test('三个角色都能开局并带上各自起始武器', () => {
  for (const c of CHARACTERS) {
    const w = createWorld({ characterId: c.id, seed: 7 });
    assert.equal(w.player.characterId, c.id);
    assert.equal(w.player.sprite, c.sprite);
    assert.equal(w.player.weapons.length, 1);
    assert.equal(w.player.weapons[0].id, c.startWeapon);
  }
});

test('每条战斗数值保持原样，未被换皮改动', () => {
  const STATS = {
    hachiware: { maxHp: 120, speed: 170, startWeapon: 'hairball' },
    chiikawa: { maxHp: 90, speed: 208, startWeapon: 'claw' },
    usagi: { maxHp: 96, speed: 158, startWeapon: 'laser' },
  };
  for (const e of EXPECTED) {
    const c = CHARACTER_BY_ID[e.id];
    assert.equal(c.base.maxHp, STATS[e.id].maxHp, `${c.name} 最大生命被改动`);
    assert.equal(c.base.speed, STATS[e.id].speed, `${c.name} 移速被改动`);
    assert.equal(c.startWeapon, STATS[e.id].startWeapon, `${c.name} 起始武器被改动`);
  }
});

test('未知或已移除的角色标识回退到首位角色', () => {
  assert.equal(getCharacter('shadow').id, 'hachiware');
  assert.equal(getCharacter('nope').id, 'hachiware');
  assert.equal(getCharacter(undefined).id, 'hachiware');
  const w = createWorld({ characterId: 'shadow', seed: 3 });
  assert.equal(w.player.characterId, 'hachiware');
});