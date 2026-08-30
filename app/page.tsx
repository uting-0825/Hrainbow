'use client';

import { lazy, Suspense, useSyncExternalStore } from 'react';

const MemoryRoom = lazy(() => import('./components/MemoryRoom'));
const subscribeToClient = () => () => undefined;

function useIsClient() {
  return useSyncExternalStore(subscribeToClient, () => true, () => false);
}

function RoomShell() {
  return (
    <main className="memory-room" aria-busy="true">
      <header className="scene-title">
        <div className="scene-heading">
          <p>09 / 05 · 小润</p>
          <div className="scene-dialog">正在打开回忆书房…</div>
        </div>
        <span>一间正在慢慢住进故事的房间</span>
      </header>
      <section className="room-stage" aria-label="水彩书房正在准备">
        <img
          className="room-painting"
          src="/assets/room-main-v1.jpg"
          width={1672}
          height={941}
          fetchPriority="high"
          decoding="async"
          alt="水彩风格的复古书房，摆放着旅行地图、电脑、台灯、唱片机，一只金毛坐在书桌旁"
        />
      </section>
      <footer className="scene-footer">
        <span><i />正在准备互动内容…</span>
      </footer>
    </main>
  );
}

export default function Home() {
  const mounted = useIsClient();

  if (!mounted) return <RoomShell />;

  return (
    <Suspense fallback={<RoomShell />}>
      <MemoryRoom />
    </Suspense>
  );
}
