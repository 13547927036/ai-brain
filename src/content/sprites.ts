/**
 * 角色贴图资源表。
 *
 * 路径故意不带前导斜杠：浏览器下相对 index.html 解析为 /assets/...，
 * 微信小游戏打包后同样是包内相对路径，两边都不用改。
 */
export interface SpriteRef {
  /** 常态图 */
  normal: string;
  /** 受击图（缺省时受击不换图，只闪白） */
  hit?: string;
}

export const CHARACTER_SPRITES: Record<string, SpriteRef> = {
  player_hachiware: { normal: 'assets/chars/hachiware.png', hit: 'assets/chars/hachiware-hit.png' },
  player_chiikawa: { normal: 'assets/chars/chiikawa.png', hit: 'assets/chars/chiikawa-hit.png' },
  player_usagi: { normal: 'assets/chars/usagi.png', hit: 'assets/chars/usagi-hit.png' },
};

/** 按贴图键查资源，未登记返回 undefined */
export function getSprite(key: string): SpriteRef | undefined {
  return CHARACTER_SPRITES[key];
}

/** 已登记的全部贴图键，供测试与调试 */
export function spriteKeys(): string[] {
  return Object.keys(CHARACTER_SPRITES);
}