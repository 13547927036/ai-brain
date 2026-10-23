import React, { useEffect, useRef } from 'react';
import { getTheme } from '../content/theme.js';
import { drawSpriteIcon } from '../render/sprites.js';

/** 用同一套程序化美术画图标，换主题时自动重绘。 */
export default function SpriteIcon({ spriteId, size = 40, themeId = 'neon', className = '', style }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      drawSpriteIcon(ref.current, spriteId, getTheme(themeId), size);
    }
  }, [spriteId, themeId, size]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, display: 'block', ...style }}
    />
  );
}