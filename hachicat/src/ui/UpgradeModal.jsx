import React, { useEffect } from 'react';
import Icon from './Icon.jsx';
import { RARITY_LABEL } from '../content/upgrades.js';

export default function UpgradeModal({ controller, snap }) {
  const options = snap.upgradeOptions || [];

  useEffect(() => {
    const onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) controller.chooseUpgrade(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller, options.length]);

  if (!options.length) return null;

  return (
    <div className="overlay overlay--center" role="dialog" aria-modal="true" aria-label="升级选择">
      <div className="upgrade-sheet">
        <div className="upgrade-sheet__head">
          <p className="upgrade-sheet__eyebrow">LEVEL {snap.level}</p>
          <h2 className="upgrade-sheet__title">升了一级</h2>
          <p className="upgrade-sheet__sub">选一项，带着它继续跑。</p>
        </div>

        <div className="upgrade-list">
          {options.map((o, i) => (
            <button
              key={o.id}
              className={`upgrade-card rarity-${o.rarity}`}
              data-testid={`upgrade-${i}`}
              onClick={() => controller.chooseUpgrade(i)}
            >
              <span className="upgrade-card__icon">
                <Icon name={o.icon} size={22} />
              </span>
              <span className="upgrade-card__main">
                <span className="upgrade-card__top">
                  <span className="upgrade-card__name">{o.name}</span>
                  <span className="tag">{RARITY_LABEL[o.rarity]}</span>
                </span>
                <span className="upgrade-card__mods">{o.mods.join(' · ')}</span>
                <span className="upgrade-card__flavor">
                  {o.flavor}
                  {o.count > 0 ? ` · 已有 ${o.count} 层` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}