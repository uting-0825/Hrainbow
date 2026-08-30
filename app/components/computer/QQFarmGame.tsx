import { useEffect, useMemo, useState } from 'react';
import { playComputerSound } from './computerAudio';

type QQFarmGameProps = { onExit: () => void; onComplete: () => void };
type PlotStatus = 'empty' | 'seeded' | 'watered' | 'mature' | 'harvested' | 'mystery' | 'stolen';

const crops = [
  { name: '萝卜', emoji: '🥕' },
  { name: '草莓', emoji: '🍓' },
  { name: '玉米', emoji: '🌽' },
  { name: '番茄', emoji: '🍅' },
  { name: '南瓜', emoji: '🎃' },
  { name: '向日葵', emoji: '🌻' },
];

export default function QQFarmGame({ onExit, onComplete }: QQFarmGameProps) {
  const [round, setRound] = useState<1 | 2>(1);
  const [plots, setPlots] = useState<PlotStatus[]>(Array(9).fill('empty'));
  const [message, setMessage] = useState('欢迎来到何女士的QQ农场。先种点东西吧。');
  const [stealing, setStealing] = useState(false);
  const [dialog, setDialog] = useState<0 | 1 | 2>(0);
  const cropOrder = useMemo(() => Array.from({ length: 9 }, (_, index) => crops[index % crops.length]), []);

  const allSeeded = plots.every((plot) => plot === 'seeded');
  const hasMature = plots.some((plot) => plot === 'mature');

  useEffect(() => {
    if (!stealing) return;
    const timers = Array.from({ length: 9 }, (_, index) => window.setTimeout(() => {
      setPlots((current) => current.map((plot, plotIndex) => plotIndex === index && plot === 'mature' ? 'stolen' : plot));
    }, 650 + index * 145));
    const finish = window.setTimeout(() => setDialog(1), 2350);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(finish);
    };
  }, [stealing]);

  const plant = (index: number) => {
    if (plots[index] !== 'empty') return;
    setPlots((current) => current.map((plot, plotIndex) => plotIndex === index ? 'seeded' : plot));
    setMessage('种子埋好啦，继续把空地种满。');
  };

  const water = () => {
    if (!allSeeded) return;
    setPlots(Array(9).fill('watered'));
    setMessage('正在浇水……作物马上就长大。');
    window.setTimeout(() => {
      setPlots(Array.from({ length: 9 }, (_, index) => round === 2 && index === 4 ? 'mystery' : 'mature'));
      setMessage(round === 1 ? '成熟啦！点击作物收获。' : '咦，中间那块地长出了一个“？”');
    }, 1250);
  };

  const harvest = (index: number) => {
    if (plots[index] === 'mystery') {
      playComputerSound('chaos');
      setMessage('这块地怎么在动？！');
      setStealing(true);
      setPlots((current) => current.map((plot, plotIndex) => plotIndex === index ? 'stolen' : plot));
      return;
    }
    if (plots[index] !== 'mature' || stealing) return;
    const next = plots.map((plot, plotIndex) => plotIndex === index ? 'harvested' : plot);
    setPlots(next);
    playComputerSound('success');
    setMessage(`收获成功！${cropOrder[index].name} ×${(index % 2) + 1}`);
    if (next.every((plot) => plot === 'harvested')) {
      window.setTimeout(() => {
        setRound(2);
        setPlots(Array(9).fill('empty'));
        setMessage('收成不错。再种最后一轮吧。');
      }, 700);
    }
  };

  return (
    <div className="farm-game game-screen">
      <div className="game-toolbar">
        <button type="button" onClick={onExit}>← 游戏库</button>
        <strong>QQ农场</strong>
        <span>第 {round} 轮</span>
      </div>
      <div className="farm-notice">{message}</div>
      <div className={`farm-grid ${stealing ? 'is-chaos' : ''}`}>
        {plots.map((status, index) => (
          <button
            type="button"
            key={index}
            className={`farm-plot is-${status}`}
            onClick={() => status === 'empty' ? plant(index) : harvest(index)}
            aria-label={`第 ${index + 1} 块土地，${status}`}
          >
            <span className="soil-lines" aria-hidden="true" />
            {status === 'seeded' && <span className="seed" aria-hidden="true">•</span>}
            {status === 'watered' && <span className="water-drops" aria-hidden="true">💧</span>}
            {status === 'mature' && <span className="crop" aria-hidden="true">{cropOrder[index].emoji}</span>}
            {status === 'mystery' && <span className="mystery-crop" aria-hidden="true">?</span>}
          </button>
        ))}
        {stealing && (
          <div className="farm-thief" aria-label="yt 正在偷菜">
            <img src="/assets/computer/steam/qq-farm/yt-avatar.png" alt="yt" />
          </div>
        )}
      </div>
      <div className="farm-actions">
        <button type="button" disabled={!allSeeded} onClick={water}>💧 浇水</button>
        <small>{hasMature ? '点击成熟的作物收获' : '点击土地播种'}</small>
      </div>

      {dialog > 0 && (
        <div className="xp-prompt-layer">
          <div className="xp-prompt">
            <header>农场通知</header>
            {dialog === 1 ? (
              <>
                <p>您的菜已被 yt 偷走。<br /><strong>本次损失：全部。</strong></p>
                <button type="button" onClick={() => setDialog(2)}>去她家偷回来</button>
              </>
            ) : (
              <>
                <p>对不起，该好友脸皮较厚，无法进入。</p>
                <button type="button" onClick={onComplete}>认栽</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
