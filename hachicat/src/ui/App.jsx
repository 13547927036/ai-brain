import React, { useEffect, useSyncExternalStore } from 'react';
import MainMenu from './MainMenu.jsx';
import CharacterSelect from './CharacterSelect.jsx';
import GameScreen from './GameScreen.jsx';

export default function App({ controller }) {
  const snap = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useEffect(() => {
    document.documentElement.dataset.theme = snap.themeId;
  }, [snap.themeId]);

  return (
    <div className="app">
      <div className="stage" data-screen={snap.screen}>
        {snap.screen === 'menu' && <MainMenu controller={controller} snap={snap} />}
        {snap.screen === 'char' && <CharacterSelect controller={controller} snap={snap} />}
        {snap.screen === 'game' && <GameScreen controller={controller} snap={snap} />}
      </div>
    </div>
  );
}