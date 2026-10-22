import React from 'react';
import Icon from './Icon.jsx';
import SpriteIcon from './SpriteIcon.jsx';

export default function ShopScreen({ controller, snap }) {
  const shop = snap.shop;
  if (!shop) return null;

  const isBossNext = snap.wave + 1 >= snap.totalWaves;
  const hpFull = shop.hp >= shop.maxHp;
  const canHeal = !hpFull && snap.money >= shop.healPrice;
  const canReroll = snap.money >= shop.rerollCost;
  const stats = snap.stats || {};

  return (
    <div className="overlay overlay--solid shop" role="dialog" aria-modal="true" aria-label="商店">
      <header className="shop__head">
        <div>
          <h2 className="shop__title">修整一下</h2>
          <p className="shop__sub">第 {snap.wave} 波清场 · 挑点东西再走</p>
        </div>
        <div className="shop__money">
          <Icon name="coin" size={15} />
          {snap.money}
        </div>
      </header>

      <div className="shop__scroll">
        <div className="shop__grid">
          {shop.offers.map((o) => (
            <button
              key={o.key}
              className={`offer rarity-${o.rarity} ${o.sold ? 'is-sold' : ''} ${
                !o.canBuy && !o.sold ? 'is-poor' : ''
              }`}
              disabled={!o.canBuy}
              data-testid={`buy-${o.index}`}
              onClick={() => controller.buy(o.index)}
            >
              <span className="offer__top">
                <span className="offer__icon">
                  <SpriteIcon spriteId={o.icon} size={30} themeId={snap.themeId} />
                </span>
                <span className="offer__heading">
                  <span className="offer__name">{o.name}</span>
                  <span className="offer__tag">{o.tag}</span>
                </span>
              </span>
              <span className="offer__desc">{o.desc}</span>
              {o.mods ? <span className="offer__mods">{o.mods}</span> : null}
              <span className="offer__buy">
                <span className="offer__price">
                  <Icon name="coin" size={12} />
                  {o.price}
                </span>
                <span>{o.sold ? '已购' : o.reason || '购买'}</span>
              </span>
              {o.sold && <span className="offer__sold">已购</span>}
            </button>
          ))}
        </div>

        <section className="shop__build">
          <h3>当前装备</h3>
          <div className="shop__weapons">
            {snap.weapons.map((w) => (
              <span className="build-weapon" key={w.id}>
                <SpriteIcon spriteId={w.icon} size={18} themeId={snap.themeId} />
                {w.name}
                <b>Lv.{w.level}</b>
              </span>
            ))}
          </div>
          <p className="shop__stats">
            生命 {snap.hp}/{snap.maxHp} · 伤害 ×{(stats.damageMul || 1).toFixed(2)} · 攻速 ×
            {(stats.attackSpeedMul || 1).toFixed(2)} · 护甲 {stats.armor || 0} · 暴击{' '}
            {Math.round((stats.crit || 0) * 100)}%
          </p>
        </section>
      </div>

      <footer className="shop__foot">
        <div className="shop__sub-actions">
          <button
            className="btn btn--ghost btn--sm"
            disabled={!canHeal}
            onClick={() => controller.heal()}
          >
            {hpFull ? '生命已满' : `治疗 ${shop.healPrice}`}
          </button>
          <button
            className="btn btn--ghost btn--sm"
            disabled={!canReroll}
            onClick={() => controller.reroll()}
          >
            <Icon name="refresh" size={14} />
            刷新 {shop.rerollCost}
          </button>
        </div>
        <button
          className="btn btn--primary btn--lg btn--block"
          data-testid="next-wave"
          onClick={() => controller.nextWave()}
        >
          {isBossNext ? '挑战首领' : `下一波 · 第 ${snap.wave + 1} 波`}
        </button>
      </footer>
    </div>
  );
}