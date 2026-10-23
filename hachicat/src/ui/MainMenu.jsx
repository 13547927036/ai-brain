import React from 'react';
import Icon from './Icon.jsx';
import SpriteIcon from './SpriteIcon.jsx';
import { THEMES } from '../content/theme.js';
import { getCommission } from '../content/commissions.js';

export default function MainMenu({ controller, snap }) {
  const best = snap.bestWave || 0;
  const commission = getCommission();

  return (
    <div className="screen screen--menu">
      <div className="menu__top">
        <span className="chip">
          <Icon name="trophy" size={13} />
          最佳 第 {best} 波
        </span>
        <span className="chip">
          <Icon name="skull" size={13} />
          {snap.runs} 局
        </span>
        <button
          className="icon-btn menu__sound"
          onClick={() => controller.toggleMute()}
          aria-label={snap.muted ? '打开声音' : '关闭声音'}
        >
          <Icon name={snap.muted ? 'mute' : 'sound'} size={18} />
        </button>
      </div>

      <div className="menu__hero">
        <div className="menu__art">
          <SpriteIcon spriteId="cat.ginger" size={186} themeId={snap.themeId} />
          <span className="menu__stamp">{commission.name}</span>
        </div>
        <h1 className="brand__title">哈气猫</h1>
        <p className="brand__en">HACHICAT</p>
        <p className="brand__sub">接一单讨伐，赚够这个月的猫粮</p>
      </div>

      <div className="menu__actions">
        <div className="menu__record">
          <div className="record-card">
            <div className="record-card__label">最远</div>
            <div className="record-card__value">第 {best} 波</div>
          </div>
          <div className="record-card">
            <div className="record-card__label">通关</div>
            <div className="record-card__value">{snap.wins} 次</div>
          </div>
        </div>

        <button
          className="btn btn--primary btn--lg btn--block"
          data-testid="start-game"
          onClick={() => controller.showCharacters()}
        >
          <Icon name="paw" size={20} />
          接取{commission.name}
        </button>

        <div className="menu__row">
          <div className="segmented" role="group" aria-label="画风">
            {Object.values(THEMES).map((t) => (
              <button
                key={t.id}
                className="segmented__btn"
                aria-pressed={snap.themeId === t.id}
                onClick={() => controller.setTheme(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <p className="menu__hint">拖动屏幕移动 · 武器自动开火 · 每波结束逛商店</p>
      </div>
    </div>
  );
}