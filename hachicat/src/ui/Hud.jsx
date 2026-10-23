import React from 'react';
import Icon from './Icon.jsx';
import SpriteIcon from './SpriteIcon.jsx';

export default function Hud({ snap, controller }) {
  const hpPct = snap.maxHp ? Math.max(0, Math.min(100, (snap.hp / snap.maxHp) * 100)) : 0;
  const xpPct = snap.xpNext ? Math.max(0, Math.min(100, (snap.xp / snap.xpNext) * 100)) : 0;
  const timeLeft = Math.max(0, Math.ceil((snap.waveDuration || 0) - (snap.waveTime || 0)));
  const bossPct = snap.boss ? Math.max(0, Math.min(100, (snap.boss.hp / snap.boss.maxHp) * 100)) : 0;

  return (
    <div className="hud">
      <div className="hud__top">
        <div className="hud__wave">
          <div className="hud__wave-main">
            第 {snap.wave} 波
            <span className="hud__wave-total">/ {snap.totalWaves}</span>
          </div>
          <div className="hud__wave-name">
            {snap.waveName} · {snap.bossWave ? '首领战' : `${timeLeft}s`}
          </div>
        </div>

        <div className="hud__right">
          <div className="hud__money">
            <Icon name="coin" size={14} />
            {snap.money}
          </div>
          <button
            className="icon-btn hud__pause"
            data-testid="pause"
            aria-label="暂停"
            onClick={() => controller.pause()}
          >
            <Icon name="pause" size={18} />
          </button>
        </div>
      </div>

      <div className="hud__bars">
        <div className="hud__hp">
          <div className="bar bar--hp">
            <div className="bar__fill" style={{ width: `${hpPct}%` }} />
            <div className="bar__label">
              {snap.hp} / {snap.maxHp}
            </div>
          </div>
        </div>
        <div className="hud__xp">
          <span className="level-badge">Lv.{snap.level}</span>
          <div className="bar bar--xp">
            <div className="bar__fill" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      {snap.boss && (
        <div className="hud__boss">
          <div className="hud__boss-top">
            <span>首领 · {snap.boss.name}</span>
            <span>
              {snap.boss.hp} / {snap.boss.maxHp}
            </span>
          </div>
          <div className="bar bar--boss">
            <div className="bar__fill" style={{ width: `${bossPct}%` }} />
          </div>
        </div>
      )}

      <div className="hud__weapons">
        {snap.weapons.map((w, i) => (
          <div key={`${w.id}-${i}`} className="weapon-chip" title={`${w.name} Lv.${w.level}`}>
            <SpriteIcon spriteId={w.icon} size={26} themeId={snap.themeId} />
            <span className="weapon-chip__lv">{w.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}