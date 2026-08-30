import { useEffect, useState } from 'react';
import { playComputerSound } from './computerAudio';

type PuzzleGameProps = { onExit: () => void; onComplete: () => void; onSave: () => void };
type PuzzlePhase = 'preview' | 'ready' | 'playing' | 'complete';

const solved = Array.from({ length: 9 }, (_, index) => index);

function createFullShuffle() {
  let next: number[] = [];
  do {
    next = [...solved];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
  } while (next.some((tile, index) => tile === index));
  return next;
}

export default function PuzzleGame({ onExit, onComplete, onSave }: PuzzleGameProps) {
  const [phase, setPhase] = useState<PuzzlePhase>('preview');
  const [tiles, setTiles] = useState(solved);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase('ready'), 1650);
    return () => window.clearTimeout(timer);
  }, []);

  const swap = (index: number) => {
    if (phase !== 'playing') return;
    if (selected === null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    const next = [...tiles];
    [next[selected], next[index]] = [next[index], next[selected]];
    setTiles(next);
    setSelected(null);
    setMoves((current) => current + 1);
    playComputerSound('drop');
    if (next.every((tile, tileIndex) => tile === solved[tileIndex])) {
      playComputerSound('success');
      setPhase('complete');
      onComplete();
    }
  };

  return (
    <div className="puzzle-game game-screen">
      <div className="game-toolbar">
        <button type="button" onClick={onExit}>← 游戏库</button>
        <strong>何女士的记忆碎片</strong>
        <span>步数：{moves}</span>
      </div>

      {phase === 'preview' && (
        <div className="puzzle-preview"><img src="/assets/computer/steam/puzzle/memory.jpg" alt="拼图完整预览" /><p>先看清楚哦……</p></div>
      )}
      {phase === 'ready' && (
        <div className="puzzle-ready">
          <strong>记住了吗？</strong>
          <button type="button" onClick={() => { setTiles(createFullShuffle()); setMoves(0); setSelected(null); playComputerSound('chaos'); setPhase('playing'); }}>全部打乱</button>
        </div>
      )}
      {(phase === 'playing' || phase === 'complete') && (
        <div className={`puzzle-board ${phase === 'complete' ? 'is-complete' : 'is-shuffled'}`}>
          {tiles.map((tile, index) => (
            <button
              type="button"
              key={index}
              className={selected === index ? 'is-selected' : ''}
              onClick={() => swap(index)}
              aria-label={`拼图第 ${index + 1} 格`}
              style={{
                backgroundImage: "url('/assets/computer/steam/puzzle/memory.jpg')",
                backgroundPosition: `${(tile % 3) * 50}% ${Math.floor(tile / 3) * 50}%`,
              }}
            />
          ))}
        </div>
      )}
      {phase === 'playing' && <p className="puzzle-help">点击第一块，再点击第二块交换位置</p>}
      {phase === 'complete' && (
        <div className="puzzle-success">
          <strong>拼图完成！</strong>
          <p>成就解锁：<br />《何女士的记忆碎片》</p>
          <button type="button" onClick={onSave}>保存到桌面</button>
        </div>
      )}
    </div>
  );
}
