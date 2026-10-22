import React, { useState } from 'react';
import Icon from './Icon.jsx';
import SpriteIcon from './SpriteIcon.jsx';
import { CHARACTERS } from '../content/characters.js';
import { getWeapon } from '../content/weapons.js';

function weaponName(id) {
  return getWeapon(id)?.name || id;
}

export default function CharacterSelect({ controller, snap }) {
  const [selected, setSelected] = useState('ginger');
  const current = CHARACTERS.find((c) => c.id === selected) || CHARACTERS[0];

  return (
    <div className="screen screen--char">
      <header className="screen__head">
        <button className="icon-btn" aria-label="返回" onClick={() => controller.showMenu()}>
          <Icon name="arrowLeft" size={19} />
        </button>
        <div>
          <h2 className="screen__title">选一只猫</h2>
          <p className="screen__sub">起点不同，巷子一样黑。</p>
        </div>
      </header>

      <div className="char-list">
        {CHARACTERS.map((c) => {
          const locked = c.unlock ? !snap.shadowUnlocked : false;
          const active = c.id === selected && !locked;
          return (
            <button
              key={c.id}
              className={`char-card ${active ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`}
              aria-pressed={active}
              disabled={locked}
              data-testid={`char-${c.id}`}
              onClick={() => setSelected(c.id)}
            >
              <span className="char-card__sprite">
                <SpriteIcon spriteId={c.sprite} size={56} themeId={snap.themeId} />
              </span>
              <span className="char-card__info">
                <span className="char-card__row">
                  <span className="char-card__name">{c.name}</span>
                  <span className="char-card__title">{c.title}</span>
                </span>
                <span className="char-card__trait">{c.trait}</span>
                <span className="char-card__meta">
                  <span className="char-card__weapon">
                    <Icon name="sword" size={12} />
                    {weaponName(c.startWeapon)}
                  </span>
                  <span>生命 {c.base.maxHp}</span>
                  <span>移速 {c.base.speed}</span>
                </span>
              </span>
              {locked && (
                <span className="char-card__lock">
                  <Icon name="lock" size={12} />
                  {c.unlock.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="char-footer">
        <button
          className="btn btn--primary btn--lg btn--block"
          data-testid="start-run"
          onClick={() => controller.startRun(current.id)}
        >
          带 {current.name} 出发
          <Icon name="arrowRight" size={18} />
        </button>
      </div>
    </div>
  );
}