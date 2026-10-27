import React from 'react';
import Icon from './Icon.jsx';
import SpriteIcon from './SpriteIcon.jsx';
import { MAX_WEAPONS } from '../content/weapons.js';

export default function ShopScreen({ controller, snap }) {
  const shop = snap.shop;
  if (!shop) return null;

  const isBossNext = snap.wave + 1 >= snap.totalWaves;
  const hpFull = shop.hp >= shop.maxHp;
  const canHeal = !hpFull && snap.money >= shop.healPrice;
  const canReroll = snap.money >= shop.rerollCost;
  const stats = snap.stats || {};

  return (
    <div className="overlay overlay--solid shop" role="dialog" aria-modal="true" aria-label="补给点">
      <header className="shop__head">
        <div>
          <h2 className="shop__title">委托间隙</h2>
          <p className="shop__sub">第 {snap.wave} 波结束 · 在路边补给点歇口气</p>
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
                <span>{o.sold ? '已买' : o.reason || '买下'}</span>
              </span>
              {o.sold && <span className="offer__sold">已买</span>}
            </button>
          ))}
        </div>

        <section className="shop__build">
          <h3>随身装备 · {snap.weapons.length}/{MAX_WEAPONS} 格</h3>
          <div className="shop__weapons">
            {snap.weapons.map((w, i) => (
              <span className="build-weapon" key={`${w.id}-${i}`}>
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

        {shop.synthesis?.length ? (
          <section className="shop__build">
            <h3>装备整理 · 同等级两件合一件</h3>
            <div className="shop__weapons">
              {shop.synthesis.map((s) => (
                <button
                  key={s.id}
                  className="btn btn--ghost btn--sm"
                  data-testid={`synthesize-${s.id}`}
                  onClick={() => controller.synthesize(s.id)}
                >
                  {snap.weapons.find((w) => w.id === s.id)?.name || s.id} ×{s.count} → Lv.
                  {s.nextLevel}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <footer className="shop__foot">
        <div className="shop__sub-actions">
          <button
            className="btn btn--ghost btn--sm"
            disabled={!canHeal}
            onClick={() => controller.heal()}
          >
            {hpFull ? '现在还不累' : `喝碗热汤 ${shop.healPrice}`}
          </button>
          <button
            className="btn btn--ghost btn--sm"
            disabled={!canReroll}
            onClick={() => controller.reroll()}
          >
            <Icon name="refresh" size={14} />
            换一批 {shop.rerollCost}
          </button>
        </div>
        <button
          className="btn btn--primary btn--lg btn--block"
          data-testid="next-wave"
          onClick={() => controller.nextWave()}
        >
          {isBossNext ? '迎战讨伐目标' : `继续赶路 · 第 ${snap.wave + 1} 波`}
        </button>
      </footer>
    </div>
  );
}