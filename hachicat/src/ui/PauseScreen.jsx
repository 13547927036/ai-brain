import React from 'react';
import Icon from './Icon.jsx';
import { THEMES } from '../content/theme.js';

export default function PauseScreen({ controller, snap }) {
  return (
    <div className="overlay overlay--center" role="dialog" aria-modal="true" aria-label="暂停">
      <div className="pause-card panel">
        <h2 className="pause-card__title">暂停</h2>
        <p className="pause-card__sub">喘口气，猫。</p>

        <div className="pause-card__stats">
          <span className="chip">第 {snap.wave} 波</span>
          <span className="chip">Lv.{snap.level}</span>
          <span className="chip">{snap.kills} 击杀</span>
        </div>

        <button
          className="btn btn--primary btn--block"
          data-testid="resume"
          onClick={() => controller.resume()}
        >
          <Icon name="play" size={16} />
          继续
        </button>
        <button className="btn btn--ghost btn--block" onClick={() => controller.restart()}>
          <Icon name="refresh" size={16} />
          重新开始
        </button>
        <button className="btn btn--ghost btn--block" onClick={() => controller.quitToMenu()}>
          返回主菜单
        </button>

        <div className="pause-card__settings">
          <button
            className="icon-btn"
            onClick={() => controller.toggleMute()}
            aria-label={snap.muted ? '打开声音' : '关闭声音'}
          >
            <Icon name={snap.muted ? 'mute' : 'sound'} size={18} />
          </button>
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
      </div>
    </div>
  );
}