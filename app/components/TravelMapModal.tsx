'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

type TravelMapModalProps = { onClose: () => void };
type CityId = 'dongguan' | 'shantou' | 'chaozhou' | 'zhuhai' | 'hongkong' | 'macau';
type Photo = { src: string; label?: string };
type City = { id: CityId; name: string; subtitle: string; photos: Photo[] };

const asset = (path: string) => `/assets/travel/${path}`;

const cities: City[] = [
  {
    id: 'dongguan', name: '东莞', subtitle: '在日常里捡到的可爱瞬间',
    photos: [
      { src: asset('guangdong/dongguan/01.webp'), label: 'KTV' },
      { src: asset('guangdong/dongguan/02.webp'), label: 'yt 的家' },
      { src: asset('guangdong/dongguan/03.webp'), label: '莞城' },
      { src: asset('guangdong/dongguan/04.webp'), label: '麦当劳' },
    ],
  },
  {
    id: 'shantou', name: '汕头', subtitle: '海风、旧街和贴得很近的合照',
    photos: [
      { src: asset('guangdong/shantou/01.webp') },
      { src: asset('guangdong/shantou/02.webp'), label: '汕头小公园' },
      { src: asset('guangdong/shantou/03.webp'), label: '礐石公园' },
    ],
  },
  {
    id: 'chaozhou', name: '潮州', subtitle: '一些认真玩耍，也认真犯傻的晚上',
    photos: [
      { src: asset('guangdong/chaozhou/01.webp') },
      { src: asset('guangdong/chaozhou/02.webp'), label: '酒店' },
      { src: asset('guangdong/chaozhou/03.webp'), label: '鲁迅公园' },
    ],
  },
  {
    id: 'zhuhai', name: '珠海', subtitle: '从一顿饭出发，慢慢逛到很远',
    photos: [
      { src: asset('guangdong/zhuhai/01.webp'), label: '何师傅带人' },
      { src: asset('guangdong/zhuhai/02.webp'), label: '和小果果' },
      { src: asset('guangdong/zhuhai/03.webp'), label: '带 yt 吃萨莉亚' },
      { src: asset('guangdong/zhuhai/04.webp'), label: '游乐园' },
    ],
  },
  {
    id: 'hongkong', name: '香港', subtitle: '一路吃、一路走，也一路拍下来',
    photos: Array.from({ length: 6 }, (_, index) => ({
      src: asset(`guangdong/hongkong/${String(index + 1).padStart(2, '0')}.webp`),
    })),
  },
  {
    id: 'macau', name: '澳门', subtitle: '阳光落在城墙边，也落在我们的相册里',
    photos: Array.from({ length: 4 }, (_, index) => ({
      src: asset(`guangdong/macau/${String(index + 1).padStart(2, '0')}.webp`),
    })),
  },
];

const provincePins = [
  { id: 'jiangsu', name: '江苏', x: 72.5, y: 41.5, w: 6.5, h: 10 },
  { id: 'jiangxi', name: '江西', x: 65.5, y: 56.5, w: 7, h: 11 },
  { id: 'fujian', name: '福建', x: 72.5, y: 59.5, w: 6.5, h: 11 },
  { id: 'guizhou', name: '贵州', x: 53.5, y: 57, w: 8.5, h: 11 },
  { id: 'guangdong', name: '广东', x: 62.5, y: 68, w: 10, h: 11 },
];

const cityPins: Array<{ id: CityId; x: number; y: number; w: number; h: number }> = [
  { id: 'dongguan', x: 60, y: 49, w: 9, h: 12 },
  { id: 'zhuhai', x: 56.3, y: 59.5, w: 9, h: 13 },
  { id: 'shantou', x: 79, y: 39, w: 8, h: 12 },
  { id: 'chaozhou', x: 82, y: 31, w: 8, h: 12 },
];

function playPaperSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const duration = 0.42;
  const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const envelope = Math.sin((i / data.length) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = 1250;
  filter.Q.value = 0.7;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.connect(filter).connect(gain).connect(context.destination);
  source.start();
  source.stop(context.currentTime + duration);
  source.addEventListener('ended', () => void context.close());
}

declare global {
  interface Window { webkitAudioContext?: typeof AudioContext }
}

export default function TravelMapModal({ onClose }: TravelMapModalProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<'china' | 'guangdong'>('china');
  const [selectedCity, setSelectedCity] = useState<CityId | null>(null);
  const [notice, setNotice] = useState('颜色更深的省份，藏着可以打开的旅行页');
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});

  const city = useMemo(() => cities.find((item) => item.id === selectedCity) ?? null, [selectedCity]);

  useEffect(() => {
    try {
      setNotes(JSON.parse(localStorage.getItem('xiaorun-travel-notes') ?? '{}'));
    } catch { setNotes({}); }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedCity) setSelectedCity(null);
      else if (view === 'guangdong') setView('china');
      else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, selectedCity, view]);

  useGSAP(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timeline
      .from('.travel-backdrop', { autoAlpha: 0, duration: reduce ? 0 : 0.35 })
      .from('.stamp-shell', {
        autoAlpha: 0,
        scale: reduce ? 1 : 0.92,
        clipPath: reduce ? 'inset(0% round 24px)' : 'inset(46% 47% 46% 47% round 24px)',
        duration: reduce ? 0 : 0.82,
      }, '<0.04')
      .from('.travel-toolbar > *', { autoAlpha: 0, y: -8, stagger: 0.06, duration: reduce ? 0 : 0.35 }, '-=0.28');
  }, { scope: rootRef });

  useGSAP(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (view === 'guangdong' && !selectedCity) {
      gsap.fromTo('.province-sheet',
        { autoAlpha: 0, scale: reduce ? 1 : 0.78, clipPath: 'circle(9% at 66% 69%)' },
        { autoAlpha: 1, scale: 1, clipPath: 'circle(100% at 50% 50%)', duration: reduce ? 0 : 0.82, ease: 'power3.inOut' });
      gsap.from('.city-pin', { autoAlpha: 0, scale: 0.5, stagger: 0.06, duration: reduce ? 0 : 0.42, ease: 'back.out(1.5)', delay: reduce ? 0 : 0.42 });
    }
    if (selectedCity) {
      gsap.fromTo('.city-gallery',
        { autoAlpha: 0, clipPath: 'inset(45% 5% 45% 5% round 28px)' },
        { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: reduce ? 0 : 0.58, ease: 'power3.inOut' });
      gsap.from('.polaroid', { autoAlpha: 0, y: reduce ? 0 : 70, scale: reduce ? 1 : 0.72, stagger: 0.075, duration: reduce ? 0 : 0.58, ease: 'back.out(1.25)', delay: reduce ? 0 : 0.2 });
    }
  }, { dependencies: [view, selectedCity], scope: rootRef, revertOnUpdate: true });

  const { contextSafe } = useGSAP({ scope: rootRef });

  const closeAnimated = contextSafe(() => {
    gsap.to('.stamp-shell', { autoAlpha: 0, scale: 0.96, duration: 0.3, ease: 'power2.in' });
    gsap.to('.travel-backdrop', { autoAlpha: 0, duration: 0.32, delay: 0.08, onComplete: onClose });
  });

  const chooseProvince = (id: string, name: string) => {
    if (id === 'guangdong') {
      setView('guangdong');
      setNotice('点击深色城市，拆开一叠属于这里的拍立得');
      return;
    }
    setNotice(`${name}的旅行页正在整理中，广东支线已经可以先逛啦`);
  };

  const openCity = (id: CityId) => {
    playPaperSound();
    setFlipped(new Set());
    setSelectedCity(id);
  };

  const togglePhoto = (key: string) => {
    playPaperSound();
    setFlipped((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const saveNote = (key: string, value: string) => {
    const next = { ...notes, [key]: value };
    setNotes(next);
    localStorage.setItem('xiaorun-travel-notes', JSON.stringify(next));
  };

  return (
    <section ref={rootRef} className="travel-modal" role="dialog" aria-modal="true" aria-label="小润的旅行地图">
      <button className="travel-backdrop" aria-label="关闭旅行地图" onClick={closeAnimated} />
      <div className="stamp-shell">
        <header className="travel-toolbar">
          <div>
            <p>OUR TRAVEL LOG · 旅行日志</p>
            <h2>{selectedCity ? `${city?.name}旅行相册` : view === 'guangdong' ? '广东省旅行地图' : '一起走过的地方'}</h2>
          </div>
          <div className="travel-actions">
            {(view === 'guangdong' || selectedCity) && (
              <button type="button" onClick={() => selectedCity ? setSelectedCity(null) : setView('china')}>
                ← {selectedCity ? '回到广东' : '回到中国地图'}
              </button>
            )}
            <button className="travel-close" type="button" aria-label="关闭" onClick={closeAnimated}>×</button>
          </div>
        </header>

        <div className="travel-canvas">
          {view === 'china' ? (
            <div className="map-sheet china-sheet">
              <img src={asset('china-map.webp')} alt="中国旅行地图，江苏、江西、福建、贵州、广东被标记为去过的地方" />
              <div className="map-wash" aria-hidden="true" />
              {provincePins.map((pin) => (
                <button
                  key={pin.id}
                  className={`province-pin ${pin.id === 'guangdong' ? 'is-ready' : ''}`}
                  style={{ left: `${pin.x}%`, top: `${pin.y}%`, width: `${pin.w}%`, height: `${pin.h}%` }}
                  onClick={() => chooseProvince(pin.id, pin.name)}
                  aria-label={`打开${pin.name}旅行页`}
                >
                  <span>{pin.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="map-sheet province-sheet">
              <img src={asset('guangdong-map.webp')} alt="广东省地图，标出了东莞、珠海、汕头、潮州、香港和澳门" />
              <div className="map-wash" aria-hidden="true" />
              {cityPins.map((pin) => {
                const item = cities.find((entry) => entry.id === pin.id)!;
                return (
                  <button
                    key={pin.id}
                    className="city-pin"
                    style={{ left: `${pin.x}%`, top: `${pin.y}%`, width: `${pin.w}%`, height: `${pin.h}%` }}
                    onClick={() => openCity(pin.id)}
                    aria-label={`打开${item.name}旅行照片`}
                  ><span>{item.name}</span></button>
                );
              })}
              <button className="harbor-pin hongkong-pin" onClick={() => openCity('hongkong')} aria-label="打开香港旅行照片">
                <img src={asset('hong-kong-icon.webp')} alt="" /><span>香港</span>
              </button>
              <button className="harbor-pin macau-pin" onClick={() => openCity('macau')} aria-label="打开澳门旅行照片">
                <img src={asset('macau-icon.webp')} alt="" /><span>澳门</span>
              </button>
            </div>
          )}
        </div>

        <footer className="travel-caption">
          <span className="travel-compass" aria-hidden="true">✦</span>
          <p>{notice}</p>
          <small>{view === 'china' ? '5 个省份留有脚印' : '点击照片可以翻到背面写留言'}</small>
        </footer>

        {city && (
          <section className="city-gallery" aria-label={`${city.name}拍立得相册`}>
            <header className="gallery-heading">
              <div><small>GUANGDONG · {city.name.toUpperCase()}</small><h3>{city.name}</h3><p>{city.subtitle}</p></div>
              <button type="button" onClick={() => setSelectedCity(null)}>收起照片 ×</button>
            </header>
            <div className="polaroid-track">
              {city.photos.map((photo, index) => {
                const key = `${city.id}-${index}`;
                const isFlipped = flipped.has(key);
                const tilt = [-2.5, 1.7, -1.1, 2.2, -1.8, 1.2][index % 6];
                return (
                  <article
                    className={`polaroid ${isFlipped ? 'is-flipped' : ''}`}
                    key={key}
                    tabIndex={0}
                    aria-label={`${photo.label || `第 ${index + 1} 张照片`}，点击翻面写留言`}
                    onClick={() => togglePhoto(key)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); togglePhoto(key); }
                    }}
                  >
                    <div className="polaroid-card" style={{ '--tilt': `${tilt}deg`, '--tilt-reverse': `${-tilt}deg` } as React.CSSProperties}>
                      <div className="polaroid-face polaroid-front">
                        <img src={photo.src} alt={photo.label || `${city.name}旅行照片`} />
                        <div className="photo-label"><span>{photo.label || '\u00a0'}</span><small>{String(index + 1).padStart(2, '0')}</small></div>
                      </div>
                      <div className="polaroid-face polaroid-back">
                        <p>写给这一天：</p>
                        <textarea
                          value={notes[key] ?? ''}
                          placeholder="点击这里，写下一句想留给小润的话……"
                          aria-label="照片背面的留言"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          onChange={(event) => saveNote(key, event.target.value)}
                        />
                        <small>留言会保存在这台设备上</small>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="gallery-tip">单击拍立得翻面 · 横向滑动查看更多</p>
          </section>
        )}
      </div>
    </section>
  );
}
