'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import AmbientCanvas from './components/AmbientCanvas';
import ComputerMode from './components/computer/ComputerMode';
import GoldenRetrieverGame from './components/GoldenRetrieverGame';
import RadioExperience from './components/RadioExperience';
import TravelMapModal from './components/TravelMapModal';

gsap.registerPlugin(useGSAP);

type Hotspot = {
  id: 'map' | 'computer' | 'record' | 'dog';
  label: string;
  hint: string;
  hoverText?: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const hotspots: Hotspot[] = [
  { id: 'map', label: '旅行地图', hint: '江西 · 福建 · 贵州 · 广东', hoverText: '旅行地图 快看看我们留下的足迹吧', x: 3.2, y: 3.5, w: 34, h: 34 },
  { id: 'computer', label: '小润的电脑', hint: 'Steam · 微信 · 回收站', hoverText: '小润的电脑 好无聊呀，玩玩智能电脑吧', x: 36.5, y: 27, w: 29, h: 31 },
  { id: 'record', label: '唱片机', hint: '一些会反复想起的旋律', x: 63, y: 28, w: 20.5, h: 31 },
  { id: 'dog', label: '金毛', hint: '它好像一直在等你摸摸', x: 8.5, y: 53, w: 22, h: 44 },
];

const defaultRoomNote = '第一次来？建议先点击唱片机，听听杂音里藏着什么';

function cropStyle(item: Hotspot) {
  return {
    left: `${item.x}%`,
    top: `${item.y}%`,
    width: `${item.w}%`,
    height: `${item.h}%`,
    '--crop-size-x': `${10000 / item.w}%`,
    '--crop-size-y': `${10000 / item.h}%`,
    '--crop-pos-x': `${(item.x / (100 - item.w)) * 100}%`,
    '--crop-pos-y': `${(item.y / (100 - item.h)) * 100}%`,
  } as React.CSSProperties;
}

export default function Home() {
  const stageRef = useRef<HTMLElement>(null);
  const [note, setNote] = useState(defaultRoomNote);
  const [mapOpen, setMapOpen] = useState(false);
  const [dogGameOpen, setDogGameOpen] = useState(false);
  const [radioOpen, setRadioOpen] = useState(false);
  const [computerOpen, setComputerOpen] = useState(false);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ desktop: '(min-width: 761px)', reduce: '(prefers-reduced-motion: reduce)' }, (context) => {
      if (context.conditions?.reduce) return;
      gsap.from('.room-stage', { autoAlpha: 0, scale: 0.985, y: 18, duration: 1.15, ease: 'power3.out' });
      gsap.from('.scene-title > *', { autoAlpha: 0, y: 10, stagger: 0.09, duration: 0.75, ease: 'power2.out' });
      gsap.to('.record-disc', { rotation: 360, repeat: -1, duration: 7, ease: 'none', transformOrigin: '50% 50%' });
      gsap.to('.dog-tail-wash', { rotation: 10, repeat: -1, yoyo: true, duration: 0.55, ease: 'sine.inOut', transformOrigin: '85% 50%' });
    });
    return () => mm.revert();
  }, { scope: stageRef });

  useGSAP(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } });
    if (computerOpen) {
      timeline
        .to('.scene-title, .scene-footer', { autoAlpha: 0, duration: reduce ? 0 : 0.42, ease: 'power2.in' }, 0)
        .to('.room-stage', {
          scale: reduce ? 1 : 1.34,
          filter: 'brightness(.36) blur(3px)',
          duration: reduce ? 0 : 1.35,
          ease: 'power3.inOut',
          transformOrigin: '51% 42%',
        }, 0);
    } else {
      timeline
        .to('.room-stage', { scale: 1, filter: 'brightness(1) blur(0px)', duration: reduce ? 0 : 0.92, ease: 'power3.out' }, 0)
        .to('.scene-title, .scene-footer', { autoAlpha: 1, duration: reduce ? 0 : 0.5, ease: 'power2.out' }, 0.32);
    }
  }, { dependencies: [computerOpen], scope: stageRef });

  const hover = (event: React.PointerEvent<HTMLButtonElement>, entering: boolean) => {
    const target = event.currentTarget;
    gsap.to(target.querySelector('.object-crop'), {
      y: entering ? -5 : 0,
      scale: entering ? 1.018 : 1,
      filter: entering ? 'brightness(1.08) saturate(1.05) drop-shadow(0 12px 14px rgba(72,45,22,.25))' : 'none',
      duration: entering ? 0.38 : 0.55,
      ease: entering ? 'power2.out' : 'power3.out',
      overwrite: 'auto',
    });
  };

  const activate = (item: Hotspot) => {
    if (item.id === 'map') {
      setMapOpen(true);
      return;
    }
    if (item.id === 'dog') {
      setDogGameOpen(true);
      return;
    }
    if (item.id === 'record') {
      setRadioOpen(true);
      return;
    }
    setComputerOpen(true);
  };

  return (
    <main ref={stageRef} className={`memory-room ${computerOpen ? 'is-computer-open' : ''}`}>
      <AmbientCanvas />
      <header className="scene-title">
        <div className="scene-heading">
          <p>09 / 05 · 小润</p>
          <div className="scene-dialog" aria-live="polite">{note}</div>
        </div>
        <span>一间正在慢慢住进故事的房间</span>
      </header>

      <section className="room-stage" aria-label="可互动的水彩书房主界面">
        <img className="room-painting" src="/assets/room-main-v1.png" alt="水彩风格的复古书房，摆放着旅行地图、电脑、台灯、唱片机，一只金毛坐在书桌旁" />
        <div className="warm-pool" aria-hidden="true" />
        <div className="screen-bloom" aria-hidden="true" />
        <div className="record-disc" aria-hidden="true" />
        <div className="dog-tail-wash" aria-hidden="true" />

        {hotspots.map((item) => (
          <button
            key={item.id}
            className={`scene-hotspot hotspot-${item.id}`}
            style={cropStyle(item)}
            aria-label={`${item.label}：${item.hint}`}
            onPointerEnter={(event) => { hover(event, true); setNote(item.hoverText ?? `${item.label}｜${item.hint}`); }}
            onPointerLeave={(event) => { hover(event, false); setNote(defaultRoomNote); }}
            onFocus={(event) => { hover(event as unknown as React.PointerEvent<HTMLButtonElement>, true); setNote(item.hoverText ?? `${item.label}｜${item.hint}`); }}
            onBlur={(event) => { hover(event as unknown as React.PointerEvent<HTMLButtonElement>, false); setNote(defaultRoomNote); }}
            onClick={() => activate(item)}
          >
            <span className="object-crop" aria-hidden="true" />
            <span className="focus-ring" aria-hidden="true" />
          </button>
        ))}
      </section>

      <footer className="scene-footer">
        <span><i />点击物品试试看吧^^</span>
      </footer>
      {mapOpen && <TravelMapModal onClose={() => setMapOpen(false)} />}
      {dogGameOpen && <GoldenRetrieverGame onClose={() => setDogGameOpen(false)} />}
      <RadioExperience isOpen={radioOpen} onClose={() => setRadioOpen(false)} />
      {computerOpen && <ComputerMode onExit={() => setComputerOpen(false)} />}
    </main>
  );
}
