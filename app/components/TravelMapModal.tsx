'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

type TravelMapModalProps = { onClose: () => void };
type ProvinceId = 'jiangsu' | 'jiangxi' | 'fujian' | 'guizhou' | 'guangdong';
type Photo = { src: string; label?: string };
type Place = { id: string; name: string; subtitle: string; photos: Photo[] };
type Province = { id: ProvinceId; name: string; english: string; map: string; alt: string; places: Place[]; direct?: boolean };

const asset = (path: string) => `/assets/travel/${path}`;
const numberedPhotos = (folder: string, count: number, labels: Array<string | undefined> = []) =>
  Array.from({ length: count }, (_, index) => ({
    src: asset(`${folder}/${String(index + 1).padStart(2, '0')}.webp`),
    label: labels[index],
  }));

const provinces: Province[] = [
  {
    id: 'jiangsu', name: '江苏', english: 'JIANGSU', map: 'jiangsu-map.webp', direct: true, alt: '南京手绘城市地图',
    places: [{ id: 'nanjing', name: '南京', subtitle: '梧桐、博物馆和一起走过的南京', photos: numberedPhotos('jiangsu/nanjing', 6, [undefined, '中山陵', '南京博物馆', '梧桐大道', '玄武门', '红山动物园']) }],
  },
  {
    id: 'jiangxi', name: '江西', english: 'JIANGXI', map: 'jiangxi-map.webp', alt: '江西省地图',
    places: [
      { id: 'nanchang', name: '南昌', subtitle: '生活里的小事，也值得好好收藏', photos: numberedPhotos('jiangxi/nanchang', 13, [undefined, undefined, '一个躺', '一起实习', '一起实验课', '一起游泳', '互相鼓励', '博物馆', '吃饭吃饭', '晚安小狗', '江西菜', '过生日', '瑶湖']) },
      { id: 'jiujiang', name: '九江', subtitle: '山风经过，照片替我们记得', photos: numberedPhotos('jiangxi/jiujiang', 3, [undefined, undefined, '庐山']) },
      { id: 'jingdezhen', name: '景德镇', subtitle: '瓷器、街巷和一张大头贴', photos: numberedPhotos('jiangxi/jingdezhen', 3, [undefined, undefined, '大头贴']) },
    ],
  },
  {
    id: 'fujian', name: '福建', english: 'FUJIAN', map: 'fujian-map.webp', alt: '福建省地图',
    places: [{ id: 'footprints', name: '福建足迹', subtitle: '沿着海岸，把几天的光收进口袋', photos: numberedPhotos('fujian/footprints', 5) }],
  },
  {
    id: 'guizhou', name: '贵州', english: 'GUIZHOU', map: 'guizhou-map.webp', alt: '贵州省地图',
    places: [{ id: 'footprints', name: '贵州足迹', subtitle: '山路、夜色和没有说完的故事', photos: numberedPhotos('guizhou/footprints', 4) }],
  },
  {
    id: 'guangdong', name: '广东', english: 'GUANGDONG', map: 'guangdong-map.webp', alt: '广东省地图',
    places: [
      { id: 'dongguan', name: '东莞', subtitle: '在日常里捡到的可爱瞬间', photos: numberedPhotos('guangdong/dongguan', 4, ['KTV', 'yt 的家', '莞城', '麦当劳']) },
      { id: 'shantou', name: '汕头', subtitle: '海风、旧街和贴得很近的合照', photos: numberedPhotos('guangdong/shantou', 3, [undefined, '汕头小公园', '礐石公园']) },
      { id: 'chaozhou', name: '潮州', subtitle: '一些认真玩耍，也认真犯傻的晚上', photos: numberedPhotos('guangdong/chaozhou', 3, [undefined, '酒店', '鲁迅公园']) },
      { id: 'zhuhai', name: '珠海', subtitle: '从一顿饭出发，慢慢逛到很远', photos: numberedPhotos('guangdong/zhuhai', 4, ['何师傅带人', '和小果果', '带 yt 吃萨莉亚', '游乐园']) },
      { id: 'hongkong', name: '香港', subtitle: '一路吃、一路走，也一路拍下来', photos: numberedPhotos('guangdong/hongkong', 6) },
      { id: 'macau', name: '澳门', subtitle: '阳光落在城墙边，也落在我们的相册里', photos: numberedPhotos('guangdong/macau', 4) },
    ],
  },
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

function fanPosition(index: number, count: number) {
  const mobile = window.innerWidth <= 760;
  const desktopX = count === 1 ? [0] : count === 2 ? [-92, 92] : count === 3 ? [-150, 0, 150] : [-205, -68, 72, 205];
  const mobileX = count === 1 ? [0] : count === 2 ? [-48, 48] : count === 3 ? [-72, 0, 72] : [-92, -31, 33, 94];
  const y = count === 1 ? [0] : count === 2 ? [7, -7] : count === 3 ? [8, -10, 7] : [11, -11, 8, -5];
  const rotation = count === 1 ? [0] : count === 2 ? [-5, 5] : count === 3 ? [-8, 1, 7] : [-9, -3, 4, 9];
  return { x: (mobile ? mobileX : desktopX)[index], y: y[index], rotation: rotation[index] };
}

declare global { interface Window { webkitAudioContext?: typeof AudioContext } }

export default function TravelMapModal({ onClose }: TravelMapModalProps) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'china' | ProvinceId>('china');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [focusedPhoto, setFocusedPhoto] = useState<number | null>(null);
  const [flippedPhoto, setFlippedPhoto] = useState<number | null>(null);
  const [previewOrigin, setPreviewOrigin] = useState({ x: 88, y: 88 });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteStatus, setNoteStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'error'>('loading');
  const saveTimers = useRef<Record<string, number>>({});
  const saveQueue = useRef<Record<string, Promise<void>>>({});

  const province = useMemo(() => provinces.find((item) => item.id === view) ?? null, [view]);
  const place = useMemo(() => province?.places.find((item) => item.id === selectedPlaceId) ?? null, [province, selectedPlaceId]);
  const visiblePhotos = useMemo(() => place?.photos.slice(page * 4, page * 4 + 4) ?? [], [place, page]);
  const pageCount = place ? Math.ceil(place.photos.length / 4) : 0;

  useEffect(() => {
    let active = true;
    fetch('/api/travel-notes', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load notes');
        return response.json() as Promise<{ notes: Record<string, string> }>;
      })
      .then(({ notes: cloudNotes }) => {
        if (!active) return;
        setNotes(cloudNotes);
        setNoteStatus('ready');
      })
      .catch(() => {
        if (active) setNoteStatus('error');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (flippedPhoto !== null) setFlippedPhoto(null);
      else if (focusedPhoto !== null) setFocusedPhoto(null);
      else if (selectedPlaceId) setSelectedPlaceId(null);
      else if (view !== 'china') setView('china');
      else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flippedPhoto, focusedPhoto, onClose, selectedPlaceId, view]);

  useGSAP(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.travel-backdrop', { autoAlpha: 0, duration: reduce ? 0 : 0.32 })
      .from('.stamp-shell', { autoAlpha: 0, scale: reduce ? 1 : 0.94, clipPath: reduce ? 'inset(0% round 24px)' : 'inset(46% 47% 46% 47% round 24px)', duration: reduce ? 0 : 0.78 }, '<0.04')
      .from('.travel-toolbar > *', { autoAlpha: 0, y: -8, stagger: 0.06, duration: reduce ? 0 : 0.32 }, '-=0.24');
  }, { scope: rootRef });

  useGSAP(() => {
    if (view === 'china') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.fromTo('.province-sheet', { autoAlpha: 0, scale: reduce ? 1 : 0.88, clipPath: 'circle(12% at 18% 18%)' }, { autoAlpha: 1, scale: 1, clipPath: 'circle(100% at 50% 50%)', duration: reduce ? 0 : 0.76, ease: 'power3.inOut' });
    gsap.from('.map-stamp-button', { autoAlpha: 0, y: reduce ? 0 : -10, stagger: 0.055, duration: reduce ? 0 : 0.42, ease: 'power3.out', delay: reduce ? 0 : 0.28 });
  }, { dependencies: [view], scope: rootRef, revertOnUpdate: true });

  useGSAP(() => {
    if (!place) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = gsap.utils.toArray<HTMLElement>('.photo-fan .polaroid');
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo('.location-preview', { autoAlpha: 0, scale: 0.68 }, { autoAlpha: 1, scale: 1, duration: reduce ? 0 : 0.22 })
      .to('.map-dim', { autoAlpha: 1, duration: reduce ? 0 : 0.34 }, 0.1)
      .fromTo(cards, { autoAlpha: 0, scale: 0.7, x: 0, y: 0, rotation: 0 }, {
        autoAlpha: 1, scale: 1,
        x: (index) => fanPosition(index, cards.length).x,
        y: (index) => fanPosition(index, cards.length).y,
        rotation: (index) => fanPosition(index, cards.length).rotation,
        duration: reduce ? 0 : 0.78, stagger: reduce ? 0 : 0.055,
      }, 0.2)
      .to('.location-preview', { autoAlpha: 0, scale: 0.84, duration: reduce ? 0 : 0.2 }, 0.4);
  }, { dependencies: [selectedPlaceId, page], scope: rootRef, revertOnUpdate: true });

  useGSAP(() => {
    if (!place) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = gsap.utils.toArray<HTMLElement>('.photo-fan .polaroid');
    cards.forEach((card, index) => {
      const position = fanPosition(index, cards.length);
      const focused = focusedPhoto === index;
      const pushedBack = focusedPhoto !== null && !focused;
      gsap.to(card, {
        x: focused ? 0 : position.x, y: focused ? 0 : position.y, rotation: focused ? 0 : position.rotation,
        scale: focused ? (window.innerWidth <= 760 ? 1.08 : 1.18) : pushedBack ? 0.86 : 1,
        autoAlpha: pushedBack ? 0.24 : 1, zIndex: focused ? 30 : index + 8,
        duration: reduce ? 0 : 0.66, ease: 'power3.out',
      });
    });
  }, { dependencies: [focusedPhoto], scope: rootRef, revertOnUpdate: true });

  const { contextSafe } = useGSAP({ scope: rootRef });
  const closeAnimated = contextSafe(() => {
    gsap.to('.stamp-shell', { autoAlpha: 0, scale: 0.96, duration: 0.28, ease: 'power2.in' });
    gsap.to('.travel-backdrop', { autoAlpha: 0, duration: 0.3, delay: 0.06, onComplete: onClose });
  });

  const rememberOrigin = (button: HTMLButtonElement) => {
    const canvas = canvasRef.current?.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    if (canvas) setPreviewOrigin({ x: rect.left - canvas.left + rect.width / 2, y: rect.top - canvas.top + rect.height + 12 });
  };

  const openPlace = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    rememberOrigin(event.currentTarget);
    playPaperSound();
    setPage(0); setFocusedPhoto(null); setFlippedPhoto(null); setSelectedPlaceId(id);
  };

  const chooseProvince = (event: React.MouseEvent<HTMLButtonElement>, item: Province) => {
    setView(item.id); setSelectedPlaceId(null); setFocusedPhoto(null); setFlippedPhoto(null);
    if (item.direct) {
      rememberOrigin(event.currentTarget);
      playPaperSound();
      window.setTimeout(() => setSelectedPlaceId(item.places[0].id), 80);
    }
  };

  const closeGallery = () => {
    setSelectedPlaceId(null); setFocusedPhoto(null); setFlippedPhoto(null); setPage(0);
  };

  const goBack = () => {
    if (selectedPlaceId && province?.direct) {
      closeGallery();
      setView('china');
    } else if (selectedPlaceId) closeGallery();
    else setView('china');
  };

  const choosePhoto = (index: number) => {
    playPaperSound();
    if (focusedPhoto !== index) { setFlippedPhoto(null); setFocusedPhoto(index); }
    else setFlippedPhoto((current) => current === index ? null : index);
  };

  const persistNote = (key: string, value: string) => {
    const request = async () => {
      const response = await fetch('/api/travel-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, note: value }),
      });
      if (!response.ok) throw new Error('Unable to save note');
    };

    setNoteStatus('saving');
    const queued = (saveQueue.current[key] ?? Promise.resolve())
      .catch(() => undefined)
      .then(request)
      .then(() => setNoteStatus('saved'))
      .catch(() => setNoteStatus('error'));
    saveQueue.current[key] = queued;
  };

  const saveNote = (key: string, value: string) => {
    setNotes((current) => ({ ...current, [key]: value }));
    setNoteStatus('saving');
    window.clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = window.setTimeout(() => persistNote(key, value), 550);
  };

  const noteStatusLabel = noteStatus === 'loading' ? '正在读取云端留言…'
    : noteStatus === 'saving' ? '正在保存到云端…'
      : noteStatus === 'saved' ? '已保存到云端'
        : noteStatus === 'error' ? '云端连接失败，请稍后重试'
          : '留言会安全保存到云端';

  const switchPage = (nextPage: number) => {
    playPaperSound(); setFocusedPhoto(null); setFlippedPhoto(null); setPage(nextPage);
  };

  const title = place ? place.name : province ? `${province.name}旅行地图` : '一起走过的地方';

  return (
    <section ref={rootRef} className="travel-modal" role="dialog" aria-modal="true" aria-label="小润的旅行地图">
      <button className="travel-backdrop" aria-label="关闭旅行地图" onClick={closeAnimated} />
      <div className="stamp-shell">
        <header className="travel-toolbar">
          <div><p>OUR TRAVEL LOG · 旅行日志</p><h2>{title}</h2></div>
          <div className="travel-actions">
            {view !== 'china' && <button type="button" onClick={goBack}>← {selectedPlaceId && !province?.direct ? `回到${province?.name}地图` : '回到中国地图'}</button>}
            <button className="travel-close" type="button" aria-label="关闭" onClick={closeAnimated}>×</button>
          </div>
        </header>

        <div ref={canvasRef} className={`travel-canvas ${place ? 'has-open-gallery' : ''}`}>
          <div className={`map-sheet ${view === 'china' ? 'china-sheet' : 'province-sheet'}`}>
            <div className="map-surface">
              <img src={asset(view === 'china' ? 'china-map.webp' : province!.map)} alt={view === 'china' ? '中国旅行地图，江苏、江西、福建、贵州、广东被标记为去过的地方' : province!.alt} />
              <div className="map-wash" aria-hidden="true" />
            </div>
            {(view === 'china' || !province?.direct) && <nav className="map-stamp-tray" aria-label={view === 'china' ? '选择省份' : '选择旅行地点'}>
              {view === 'china' ? provinces.map((item, index) => (
                <button key={item.id} className="map-stamp-button" onClick={(event) => chooseProvince(event, item)} aria-label={`打开${item.name}旅行页`}>
                  <small>{String(index + 1).padStart(2, '0')}</small><strong>{item.name}</strong><span>{item.english}</span>
                </button>
              )) : province!.places.map((item, index) => (
                <button key={item.id} className="map-stamp-button" onClick={(event) => openPlace(event, item.id)} aria-label={`打开${item.name}旅行照片`}>
                  <small>{String(index + 1).padStart(2, '0')}</small><strong>{item.name}</strong><span>OPEN ALBUM</span>
                </button>
              ))}
            </nav>}
          </div>

          {place && (
            <>
              <div className="map-dim" aria-hidden="true" />
              <div className="location-preview" style={{ left: previewOrigin.x, top: previewOrigin.y }} aria-hidden="true"><img src={place.photos[page * 4]?.src ?? place.photos[0].src} alt="" /></div>
              <section
                className="photo-gallery-layer"
                aria-label={`${place.name}拍立得相册`}
                onClick={(event) => {
                  if (focusedPhoto === null) return;
                  if ((event.target as HTMLElement).closest('.polaroid, button, textarea')) return;
                  setFlippedPhoto(null);
                  setFocusedPhoto(null);
                }}
              >
                <div className="gallery-mini-heading">
                  <div><small>{province?.english} · TRAVEL NOTES</small><h3>{place.name}</h3><p>{place.subtitle}</p></div>
                  <button type="button" onClick={closeGallery}>收起照片 ×</button>
                </div>
                <div className={`photo-fan ${focusedPhoto !== null ? 'has-focus' : ''}`}>
                  {visiblePhotos.map((photo, index) => {
                    const absoluteIndex = page * 4 + index;
                    const key = `${province?.id}-${place.id}-${absoluteIndex}`;
                    const flipped = flippedPhoto === index;
                    return (
                      <article
                        className={`polaroid ${flipped ? 'is-flipped' : ''} ${focusedPhoto === index ? 'is-focused' : ''}`}
                        key={key} tabIndex={0}
                        aria-label={`${photo.label || `第 ${absoluteIndex + 1} 张照片`}，${focusedPhoto === index ? '再次点击翻面写留言' : '点击聚焦'}`}
                        onClick={() => choosePhoto(index)}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choosePhoto(index); } }}
                      >
                        <div className="polaroid-card">
                          <div className="polaroid-face polaroid-front">
                            <img src={photo.src} alt={photo.label || `${place.name}旅行照片`} />
                            <div className="photo-label"><span>{photo.label || '\u00a0'}</span><small>{String(absoluteIndex + 1).padStart(2, '0')}</small></div>
                          </div>
                          <div className="polaroid-face polaroid-back">
                            <p>写给这一天：</p>
                            <textarea value={notes[key] ?? ''} maxLength={500} placeholder="在这里写一句想留给小润的话……" aria-label="照片背面的留言" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onChange={(event) => saveNote(key, event.target.value)} />
                            <small aria-live="polite">{noteStatusLabel}</small>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="gallery-controls">
                  {pageCount > 1 && <button type="button" disabled={page === 0} onClick={() => switchPage(page - 1)}>← 上一叠</button>}
                  <p>{focusedPhoto === null ? '点击一张拍立得，把它拿到眼前' : flippedPhoto === null ? '再点击一次，翻到背面写留言' : '正在照片背面写留言'}</p>
                  {pageCount > 1 && <button type="button" disabled={page === pageCount - 1} onClick={() => switchPage(page + 1)}>下一叠 →</button>}
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="travel-caption">
          <span className="travel-compass" aria-hidden="true">✦</span>
          <p>{view === 'china' ? '从左上角挑一枚省份邮票，打开一段旅程' : selectedPlaceId ? '照片已经摊开，挑一张仔细看看' : province?.direct ? '南京的照片正在展开' : '从左上角挑一个地点，拆开一叠拍立得'}</p>
          <small>{view === 'china' ? '5 个省份留有脚印' : `${province?.places.length ?? 0} 个旅行入口`}</small>
        </footer>
      </div>
    </section>
  );
}
