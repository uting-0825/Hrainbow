'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import AmbientCanvas from './components/AmbientCanvas';

gsap.registerPlugin(useGSAP);

type Hotspot = {
  id: 'map' | 'computer' | 'record' | 'dog';
  label: string;
  hint: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const hotspots: Hotspot[] = [
  { id: 'map', label: '旅行地图', hint: '江西 · 福建 · 贵州 · 广东', x: 3.2, y: 3.5, w: 34, h: 34 },
  { id: 'computer', label: '小润的电脑', hint: '微信 · 星露谷 · 胡闹厨房', x: 36.5, y: 27, w: 29, h: 31 },
  { id: 'record', label: '唱片机', hint: '一些会反复想起的旋律', x: 63, y: 28, w: 20.5, h: 31 },
  { id: 'dog', label: '金毛', hint: '它好像一直在等你摸摸', x: 8.5, y: 53, w: 22, h: 44 },
];

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
  const [note, setNote] = useState('把鼠标靠近房间里的物件');

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
    setNote(`${item.label}｜${item.hint}`);
  };

  return (
    <main ref={stageRef} className="memory-room">
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
            onPointerEnter={(event) => { hover(event, true); setNote(`${item.label}｜${item.hint}`); }}
            onPointerLeave={(event) => { hover(event, false); setNote('把鼠标靠近房间里的物件'); }}
            onFocus={(event) => hover(event as unknown as React.PointerEvent<HTMLButtonElement>, true)}
            onBlur={(event) => hover(event as unknown as React.PointerEvent<HTMLButtonElement>, false)}
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
    </main>
  );
}
