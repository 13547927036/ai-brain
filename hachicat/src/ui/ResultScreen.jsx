import React from 'react';

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ResultScreen({ controller, snap }) {
  const r = snap.result;
  if (!r) return null;
  const win = !!r.victory;
  const payout = r.payout || { total: r.money };

  return (
    <div className="overlay overlay--center" role="dialog" aria-modal="true" aria-label="结算">
      <div className={`result ${win ? 'result--win' : 'result--lose'}`}>
        <p className="result__eyebrow">
          {win ? '委托完成' : '委托中止'} · 报酬 +{payout.total}
        </p>
        <h2 className="result__title">{win ? '讨伐成功' : '讨伐失败'}</h2>

        <div className="result__stats">
          <div className="result__stat">
            <b>{r.wave}</b>
            <span>波次</span>
          </div>
          <div className="result__stat">
            <b>{r.kills}</b>
            <span>击杀</span>
          </div>
          <div className="result__stat">
            <b>Lv.{r.level}</b>
            <span>等级</span>
          </div>
          <div className="result__stat">
            <b>{r.damage}</b>
            <span>伤害</span>
          </div>
          <div className="result__stat">
            <b>{fmtTime(r.time)}</b>
            <span>用时</span>
          </div>
          <div className="result__stat">
            <b>{r.money}</b>
            <span>结余</span>
          </div>
        </div>

        <p className="result__record">
          评价 {r.rank || 'C'} · 最佳纪录 第 {snap.bestWave} 波
          {win ? ' · 委托完成' : ''}
        </p>

        <div className="result__actions">
          <button
            className="btn btn--primary btn--lg btn--block"
            data-testid="restart"
            onClick={() => controller.restart()}
          >
            <b>再接一单</b>
          </button>
          <div className="result__row">
            <button className="btn btn--ghost" onClick={() => controller.showCharacters()}>
              换只猫
            </button>
            <button className="btn btn--ghost" onClick={() => controller.showMenu()}>
              主菜单
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
