/**
 * 角色贴图资源表。
 *
 * 路径故意不带前导斜杠：浏览器下相对 index.html 解析为 /assets/...，
 * 微信小游戏打包后同样是包内相对路径，两边都不用改。
 *
 * 版本号放在文件名里（chiikawa.v3.png）而不是查询串：
 * 微信小游戏加载包内图片时对 query 支持不一致，文件名最稳。
 * 换图时把 SPRITE_VERSION 改成新值、重跑 tools/prep-sprites.ps1，
 * URL 一变，浏览器/CDN 的强缓存自然失效。
 */
export const SPRITE_VERSION = 'v3';

export interface SpriteRef {
  /** 常态图 */
  normal: string;
  /** 受击图（缺省时受击不换图，只闪白） */
  hit?: string;
}

function asset(base: string): string {
  return `assets/chars/${base}.${SPRITE_VERSION}.png`;
}

export const CHARACTER_SPRITES: Record<string, SpriteRef> = {
  player_hachiware: { normal: asset('hachiware'), hit: asset('hachiware-hit') },
  player_chiikawa: { normal: asset('chiikawa'), hit: asset('chiikawa-hit') },
  player_usagi: { normal: asset('usagi'), hit: asset('usagi-hit') },
};

/** 按贴图键查资源，未登记返回 undefined */
export function getSprite(key: string): SpriteRef | undefined {
  return CHARACTER_SPRITES[key];
}

/** 已登记的全部贴图键，供测试与调试 */
export function spriteKeys(): string[] {
  return Object.keys(CHARACTER_SPRITES);
}