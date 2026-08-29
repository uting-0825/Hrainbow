'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDogWander, type MovementBounds } from '../hooks/useDogWander';
import {
  ACTION_CONFIG,
  ADULT_HINTS,
  ADULT_RESULTS,
  DOG_SPRITES,
  INITIAL_HIDDEN_STATS,
  INITIAL_VISIBLE_STATS,
  applyDogAction,
  determineAdultType,
  type AdultType,
  type DogAction,
  type DogStage,
  type HiddenDogStats,
  type VisibleDogStats,
} from '../lib/dogGame';

type GoldenRetrieverGameProps = { onClose: () => void };
type GamePhase = 'playing' | 'growing' | 'revealing' | 'adult';

export const DOG_MOVEMENT_BOUNDS: MovementBounds = {
  minX: 10,
  maxX: 90,
  minY: 55,
  maxY: 82,
};

const STAGE_LABELS: Record<DogStage, { eyebrow: string; name: string }> = {
  puppy: { eyebrow: 'GROWING 01', name: '幼犬期' },
  teen: { eyebrow: 'GROWING 02', name: '少年期' },
  adult: { eyebrow: 'GROWN UP', name: '养成完成' },
};

const STATUS_ITEMS: Array<{ key: keyof VisibleDogStats; label: string }> = [
  { key: 'food', label: '饱食' },
  { key: 'happiness', label: '快乐' },
  { key: 'clean', label: '清洁' },
  { key: 'rest', label: '精神' },
];

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function statusDescription(value: number) {
  if (value >= 5) return '非常好';
  if (value >= 4) return '很好';
  if (value >= 3) return '不错';
  if (value >= 2) return '需要照顾';
  return '很需要照顾';
}

function StatusMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="dog-status-item" aria-label={`${label}状态：${statusDescription(value)}`}>
      <span>{label}</span>
      <span className="dog-status-dots" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <i key={index} className={index < value ? 'is-filled' : ''} />)}
      </span>
    </div>
  );
}

export default function GoldenRetrieverGame({ onClose }: GoldenRetrieverGameProps) {
  const [stage, setStage] = useState<DogStage>('puppy');
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [hiddenStats, setHiddenStats] = useState<HiddenDogStats>(INITIAL_HIDDEN_STATS);
  const [visibleStats, setVisibleStats] = useState<VisibleDogStats>(INITIAL_VISIBLE_STATS);
  const [activeAction, setActiveAction] = useState<DogAction | null>(null);
  const [actionFrame, setActionFrame] = useState(0);
  const [adultType, setAdultType] = useState<AdultType | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [unlockedTypes, setUnlockedTypes] = useState<AdultType[]>([]);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [speechVisible, setSpeechVisible] = useState(false);
  const [speechKey, setSpeechKey] = useState(0);
  const [message, setMessage] = useState('陪它玩一会儿吧，它会慢慢长大。');
  const mountedRef = useRef(true);
  const actionLockRef = useRef(false);
  const speechTimerRef = useRef<number | undefined>(undefined);

  const isBusy = activeAction !== null || phase !== 'playing';
  const wander = useDogWander({
    enabled: !isBusy && stage !== 'adult',
    movementBounds: DOG_MOVEMENT_BOUNDS,
  });

  useEffect(() => () => {
    mountedRef.current = false;
    if (speechTimerRef.current) window.clearTimeout(speechTimerRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (hintsOpen) setHintsOpen(false);
      else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hintsOpen, onClose]);

  const dogSource = useMemo(() => {
    if (stage === 'adult') return adultType ? DOG_SPRITES.adult[adultType] : DOG_SPRITES.adult.normal;
    if (activeAction) return DOG_SPRITES[stage].actions[activeAction][actionFrame];
    return DOG_SPRITES[stage].idle[wander.frame];
  }, [actionFrame, activeAction, adultType, stage, wander.frame]);

  const finishAsAdult = async (stats: HiddenDogStats) => {
    const result = determineAdultType(stats);
    setAdultType(result);
    setUnlockedTypes((current) => current.includes(result) ? current : [...current, result]);
    setStage('adult');
    setPhase('revealing');
    setResultVisible(false);
    setMessage('十次陪伴，悄悄长成了独一无二的它。');
    await wait(800);
    if (!mountedRef.current) return;
    setResultVisible(true);
    setPhase('adult');
  };

  const growIntoTeen = async () => {
    setPhase('growing');
    setMessage('长大了一点！');
    await wait(480);
    if (!mountedRef.current) return;
    setStage('teen');
    await wait(820);
    if (!mountedRef.current) return;
    setPhase('playing');
    setMessage('已经是少年犬啦，再陪它体验五件小事吧。');
  };

  const performAction = async (action: DogAction) => {
    if (actionLockRef.current || phase !== 'playing' || stage === 'adult') return;
    actionLockRef.current = true;
    const config = ACTION_CONFIG[action];
    wander.pause();
    setActiveAction(action);
    setMessage(config.feedback);

    for (let index = 0; index < config.cycles * 2; index += 1) {
      if (!mountedRef.current) return;
      setActionFrame(index % 2);
      await wait(config.frameMs);
    }
    if (!mountedRef.current) return;

    const next = applyDogAction(action, hiddenStats, visibleStats);
    setHiddenStats(next.hidden);
    setVisibleStats(next.visible);
    setActionFrame(0);
    setActiveAction(null);

    if (stage === 'puppy' && next.hidden.totalActions === 5) await growIntoTeen();
    else if (stage === 'teen' && next.hidden.totalActions === 10) await finishAsAdult(next.hidden);

    if (mountedRef.current) actionLockRef.current = false;
  };

  const restart = () => {
    actionLockRef.current = false;
    setStage('puppy');
    setPhase('playing');
    setHiddenStats(INITIAL_HIDDEN_STATS);
    setVisibleStats(INITIAL_VISIBLE_STATS);
    setActiveAction(null);
    setActionFrame(0);
    setAdultType(null);
    setResultVisible(false);
    setHintsOpen(false);
    setSpeechVisible(false);
    setMessage('新来的小家伙，正在熟悉房间。');
    wander.reset();
  };

  const talkToDog = () => {
    if (speechTimerRef.current) window.clearTimeout(speechTimerRef.current);
    setSpeechKey((current) => current + 1);
    setSpeechVisible(true);
    speechTimerRef.current = window.setTimeout(() => setSpeechVisible(false), 1500);
  };

  const result = adultType ? ADULT_RESULTS[adultType] : null;
  const remainingTypes = ADULT_HINTS.length - unlockedTypes.length;
  const showDog = stage !== 'adult' || resultVisible;
  const dogStyle = stage === 'adult'
    ? { left: '50%', top: '69%' }
    : { left: `${wander.position.x}%`, top: `${wander.position.y}%` };

  return (
    <section className="dog-game-modal" role="dialog" aria-modal="true" aria-label="金毛养成小游戏">
      <button className="dog-game-backdrop" type="button" aria-label="关闭金毛养成" onClick={onClose} />
      <div className="dog-game-shell">
        <header className="dog-game-header">
          <div className="dog-game-title">
            <small>MY LITTLE GOLDEN</small>
            <h2>金毛养成日记</h2>
          </div>

          {stage !== 'adult' && (
            <div className="dog-status-panel">
              <div className="dog-stage-chip">
                <small>{STAGE_LABELS[stage].eyebrow}</small>
                <strong>{STAGE_LABELS[stage].name}</strong>
              </div>
              {STATUS_ITEMS.map((item) => (
                <StatusMeter key={item.key} label={item.label} value={visibleStats[item.key]} />
              ))}
            </div>
          )}

          <button className="dog-game-close" type="button" aria-label="关闭" onClick={onClose}>×</button>
        </header>

        <div className={`dog-room phase-${phase} ${resultVisible ? 'result-visible' : ''}`}>
          <img className="dog-room-background" src="/assets/dog/background.png" alt="阳光照进温暖简约的像素风房间" />
          <div className="dog-room-warmth" aria-hidden="true" />

          {phase === 'revealing' && (
            <div className="adult-reveal-intro" aria-live="polite">
              <small>十次陪伴之后</small>
              <p>YOUR GOLDEN RETRIEVER IS...</p>
            </div>
          )}

          {resultVisible && result && (
            <div className="adult-result-copy" aria-live="polite">
              <small>YOUR GOLDEN RETRIEVER IS...</small>
              <h3>{result.name}</h3>
              <p>「{result.description}」</p>
            </div>
          )}

          {showDog && (
            <div
              role="button"
              tabIndex={0}
              aria-label="摸摸金毛，听它说话"
              className={`dog-figure ${wander.isMoving && !isBusy ? 'is-moving' : ''} ${activeAction ? `action-${activeAction}` : ''} ${phase === 'growing' ? 'is-growing' : ''} ${stage === 'adult' ? 'is-adult' : ''}`}
              style={dogStyle}
              onClick={talkToDog}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  talkToDog();
                }
              }}
            >
              <div className="dog-motion">
                {speechVisible && <div key={speechKey} className="dog-speech-bubble" role="status">喜欢小润妈咪～</div>}
                <img className="dog-sprite" src={dogSource} alt={stage === 'adult' && result ? result.name : `${STAGE_LABELS[stage].name}金毛`} />
                {activeAction === 'eat' && <div className="food-feedback" aria-hidden="true"><span>♥</span><span>饱食</span><span>♥</span></div>}
                {activeAction === 'bath' && <div className="bath-bubbles" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>}
                {activeAction === 'sleep' && <div className="sleep-zs" aria-hidden="true"><i>Z</i><i>Zz</i><i>Zzz</i></div>}
                {phase === 'growing' && <div className="growth-particles" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index}>✦</i>)}</div>}
                {stage === 'adult' && resultVisible && <div className="adult-sparkles" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index}>✦</i>)}</div>}
              </div>
            </div>
          )}

          {stage !== 'adult' && (
            <div className="dog-message" aria-live="polite">
              <span aria-hidden="true">♥</span>
              <p>{message}</p>
            </div>
          )}
        </div>

        <footer className="dog-game-footer">
          {stage !== 'adult' ? (
            <div className="dog-action-bar" aria-label="照顾金毛">
              {(Object.keys(ACTION_CONFIG) as DogAction[]).map((action) => {
                const config = ACTION_CONFIG[action];
                return (
                  <button key={action} type="button" disabled={isBusy} onClick={() => void performAction(action)}>
                    <span className="dog-action-icon" aria-hidden="true">{config.icon}</span>
                    <span><strong>{config.label}</strong><small>{config.english}</small></span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="dog-result-footer">
              {resultVisible && result ? (
                <>
                  <div className="dog-collection-copy">
                    <p>{result.name}已经把这个房间当成家啦。</p>
                    <small>
                      {remainingTypes > 0
                        ? `已遇见 ${unlockedTypes.length} / ${ADULT_HINTS.length} 种，还有 ${remainingTypes} 种金毛可以达成。`
                        : `已遇见全部 ${ADULT_HINTS.length} 种金毛，收集完成！`}
                    </small>
                  </div>
                  <div className="dog-result-actions">
                    <button className="dog-hint-button" type="button" onClick={() => setHintsOpen(true)}>查看养成提示</button>
                    <button type="button" onClick={restart}>重新养一只</button>
                  </div>
                </>
              ) : <p className="dog-reveal-wait">正在揭晓它长大后的模样...</p>}
            </div>
          )}
        </footer>

        {hintsOpen && (
          <div className="dog-hints-layer" role="dialog" aria-modal="true" aria-label="金毛结局养成提示">
            <button className="dog-hints-backdrop" type="button" aria-label="关闭养成提示" onClick={() => setHintsOpen(false)} />
            <section className="dog-hints-card">
              <header>
                <div>
                  <small>ENDING GUIDE · 结局图鉴</small>
                  <h3>怎样遇见不同的金毛？</h3>
                  <p>每轮共进行 10 次操作；判定按下列顺序进行，先满足的结局优先。</p>
                </div>
                <button type="button" aria-label="关闭" onClick={() => setHintsOpen(false)}>×</button>
              </header>
              <div className="dog-hints-grid">
                {ADULT_HINTS.map((hint, index) => {
                  const details = ADULT_RESULTS[hint.type];
                  const unlocked = unlockedTypes.includes(hint.type);
                  return (
                    <article key={hint.type} className={unlocked ? 'is-unlocked' : ''}>
                      <div className="dog-hint-name">
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <strong>{details.name}</strong>
                        <i>{unlocked ? '已遇见' : '未遇见'}</i>
                      </div>
                      <p>{hint.condition}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
