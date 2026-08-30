'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import ComputerDesktop from './ComputerDesktop';
import MemoryViewer from './MemoryViewer';
import RecycleBinApp from './RecycleBinApp';
import SteamApp from './SteamApp';
import WeChatApp from './WeChatApp';
import { playComputerSound } from './computerAudio';
import {
  COMPUTER_STATE_KEY,
  defaultComputerProgress,
  type ChatMessage,
  type ComputerApp,
  type ComputerProgress,
} from './types';

gsap.registerPlugin(useGSAP);

export default function ComputerMode({ onExit }: { onExit: () => void }) {
  const rootRef = useRef<HTMLElement>(null);
  const [app, setApp] = useState<ComputerApp>('desktop');
  const [progress, setProgress] = useState<ComputerProgress>(defaultComputerProgress);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(COMPUTER_STATE_KEY);
        if (saved) setProgress({ ...defaultComputerProgress, ...JSON.parse(saved) });
      } catch {
        // A blocked or malformed localStorage entry should never block the birthday page.
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(COMPUTER_STATE_KEY, JSON.stringify(progress));
    } catch {
      // State remains available for this page session when storage is unavailable.
    }
  }, [hydrated, progress]);

  useGSAP(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo('.computer-mode-backdrop', { autoAlpha: 0 }, { autoAlpha: 1, duration: reduce ? 0 : 0.72 })
      .fromTo('.computer-stage', { autoAlpha: 0, scale: reduce ? 1 : 0.72 }, {
        autoAlpha: 1,
        scale: 1,
        duration: reduce ? 0 : 1.2,
        ease: 'power3.inOut',
      }, 0.18)
      .from('.desktop-shortcut', { autoAlpha: 0, y: reduce ? 0 : 7, stagger: 0.07, duration: reduce ? 0 : 0.32 }, 1.05);
  }, { scope: rootRef });

  const { contextSafe } = useGSAP({ scope: rootRef });
  const exitComputer = contextSafe(() => {
    setApp('desktop');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.timeline({ onComplete: onExit })
      .to('.computer-stage', { autoAlpha: 0, scale: reduce ? 1 : 0.76, duration: reduce ? 0 : 0.78, ease: 'power3.in' })
      .to('.computer-mode-backdrop', { autoAlpha: 0, duration: reduce ? 0 : 0.28 }, '-=0.24');
  });

  const markGameComplete = (game: 'farm' | 'kitchen' | 'puzzle') => {
    const key = `${game}Complete` as 'farmComplete' | 'kitchenComplete' | 'puzzleComplete';
    setProgress((current) => ({ ...current, [key]: true }));
  };

  const completeChat = (history: ChatMessage[]) => {
    setProgress((current) => ({ ...current, wechatComplete: true, wechatHistory: history }));
  };

  const markLetterOpened = useCallback(() => {
    setProgress((current) => current.letterOpened ? current : { ...current, letterOpened: true });
  }, []);

  const markNotificationShown = useCallback(() => {
    setProgress((current) => current.notificationShown ? current : { ...current, notificationShown: true });
  }, []);

  const openApp = (nextApp: ComputerApp) => {
    playComputerSound('open');
    setApp(nextApp);
  };

  return (
    <section
      ref={rootRef}
      className="computer-mode"
      aria-label="复古电脑界面"
      onClickCapture={(event) => {
        const button = (event.target as HTMLElement).closest('button');
        if (!button) return;
        playComputerSound(button.classList.contains('xp-close') ? 'close' : 'click');
      }}
    >
      <div className="computer-mode-backdrop" aria-hidden="true" />
      <div className="computer-stage">
        <img className="computer-frame" src="/assets/computer/desktop/computer.png" alt="复古 CRT 显示器" draggable={false} />
        <div className="computer-screen-overlay">
          <ComputerDesktop
            progress={progress}
            onOpen={openApp}
            onExit={exitComputer}
            onNotificationShown={markNotificationShown}
          />
          {app === 'steam' && (
            <SteamApp
              progress={progress}
              onClose={() => setApp('desktop')}
              onComplete={markGameComplete}
              onSaveMemory={() => setProgress((current) => ({ ...current, memorySaved: true }))}
            />
          )}
          {app === 'wechat' && (
            <WeChatApp
              completed={progress.wechatComplete}
              savedHistory={progress.wechatHistory}
              onClose={() => setApp('desktop')}
              onComplete={completeChat}
            />
          )}
          {app === 'recycle-bin' && <RecycleBinApp onClose={() => setApp('desktop')} onLetterOpened={markLetterOpened} />}
          {app === 'memory' && <MemoryViewer onClose={() => setApp('desktop')} />}
        </div>
      </div>
    </section>
  );
}
