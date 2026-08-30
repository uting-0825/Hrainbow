import { useState } from 'react';
import XPWindow from './XPWindow';
import QQFarmGame from './QQFarmGame';
import KitchenGame from './KitchenGame';
import PuzzleGame from './PuzzleGame';
import type { ComputerProgress, SteamView } from './types';

type SteamAppProps = {
  progress: ComputerProgress;
  onClose: () => void;
  onComplete: (game: 'farm' | 'kitchen' | 'puzzle') => void;
  onSaveMemory: () => void;
};

const games: Array<{ id: Exclude<SteamView, 'library'>; icon: string; name: string; description: string; progressKey: keyof ComputerProgress }> = [
  { id: 'farm', icon: '🌱', name: 'QQ农场', description: '种菜、浇水，以及提防可疑好友。', progressKey: 'farmComplete' },
  { id: 'kitchen', icon: '🍳', name: '胡闹厨房·贫穷版', description: '食材有限，厨艺也比较有限。', progressKey: 'kitchenComplete' },
  { id: 'puzzle', icon: '🧩', name: '拼图', description: '把何女士的记忆碎片拼回来。', progressKey: 'puzzleComplete' },
];

export default function SteamApp({ progress, onClose, onComplete, onSaveMemory }: SteamAppProps) {
  const [view, setView] = useState<SteamView>('library');

  const finish = (game: 'farm' | 'kitchen' | 'puzzle') => {
    onComplete(game);
    setView('library');
  };

  return (
    <XPWindow title={view === 'library' ? "YT's Game Library" : `Steam - ${games.find((game) => game.id === view)?.name}`} icon="◉" onClose={onClose} className="steam-window">
      {view === 'library' && (
        <div className="steam-library">
          <aside className="steam-sidebar">
            <strong>STEAM</strong>
            <span>LIBRARY</span>
            <small>3 GAMES</small>
          </aside>
          <div className="steam-library-main">
            <header>
              <p>游戏库</p>
              <small>今天也要认真地不务正业</small>
            </header>
            <div className="steam-game-list">
              {games.map((game) => (
                <article className="steam-game-card" key={game.id}>
                  <span className="steam-game-art" aria-hidden="true">{game.icon}</span>
                  <div>
                    <h3>{game.name}</h3>
                    <p>{game.description}</p>
                  </div>
                  {Boolean(progress[game.progressKey]) && <i className="game-complete">✓</i>}
                  <button type="button" onClick={() => setView(game.id)}>PLAY</button>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
      {view === 'farm' && <QQFarmGame onExit={() => setView('library')} onComplete={() => finish('farm')} />}
      {view === 'kitchen' && <KitchenGame onExit={() => setView('library')} onComplete={() => finish('kitchen')} />}
      {view === 'puzzle' && (
        <PuzzleGame
          onExit={() => setView('library')}
          onComplete={() => onComplete('puzzle')}
          onSave={() => { onSaveMemory(); finish('puzzle'); }}
        />
      )}
    </XPWindow>
  );
}

