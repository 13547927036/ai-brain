import React, { useEffect, useRef } from 'react';
import Hud from './Hud.jsx';
import UpgradeModal from './UpgradeModal.jsx';
import ShopScreen from './ShopScreen.jsx';
import PauseScreen from './PauseScreen.jsx';
import ResultScreen from './ResultScreen.jsx';

export default function GameScreen({ controller, snap }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    controller.attachCanvas(canvas);
    return () => controller.detachCanvas();
  }, [controller]);

  return (
    <div className="game">
      <canvas ref={canvasRef} className="game__canvas" data-testid="game-canvas" />
      <Hud snap={snap} controller={controller} />
      {snap.mode === 'levelup' && <UpgradeModal controller={controller} snap={snap} />}
      {snap.mode === 'shop' && <ShopScreen controller={controller} snap={snap} />}
      {snap.mode === 'paused' && <PauseScreen controller={controller} snap={snap} />}
      {snap.mode === 'result' && <ResultScreen controller={controller} snap={snap} />}
    </div>
  );
}