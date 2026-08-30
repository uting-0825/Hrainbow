import { useEffect, useState } from 'react';
import type { ComputerApp, ComputerProgress } from './types';
import { playComputerSound } from './computerAudio';

type ComputerDesktopProps = {
  progress: ComputerProgress;
  onOpen: (app: ComputerApp) => void;
  onExit: () => void;
  onNotificationShown: () => void;
};

const shortcuts: Array<{ id: ComputerApp; label: string; image?: string; className?: string }> = [
  { id: 'steam', label: 'Steam', image: '/assets/computer/desktop/steam.png' },
  { id: 'wechat', label: '微信', image: '/assets/computer/desktop/wechat.png' },
  { id: 'recycle-bin', label: '回收站', image: '/assets/computer/desktop/recycle-bin.png' },
];

export default function ComputerDesktop({ progress, onOpen, onExit, onNotificationShown }: ComputerDesktopProps) {
  const [selected, setSelected] = useState<ComputerApp | null>(null);
  const [notice, setNotice] = useState<0 | 1 | 2>(0);
  const allComplete = progress.farmComplete && progress.kitchenComplete && progress.puzzleComplete
    && progress.wechatComplete && progress.letterOpened;

  useEffect(() => {
    if (!allComplete || progress.notificationShown) return;
    const first = window.setTimeout(() => { playComputerSound('success'); setNotice(1); }, 0);
    const second = window.setTimeout(() => setNotice(2), 1500);
    const done = window.setTimeout(() => onNotificationShown(), 4300);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.clearTimeout(done);
    };
  }, [allComplete, onNotificationShown, progress.notificationShown]);

  const openShortcut = (id: ComputerApp) => {
    setSelected(id);
    onOpen(id);
  };

  const dynamicShortcuts = progress.memorySaved
    ? [...shortcuts, { id: 'memory' as const, label: 'memory.jpg', className: 'memory-file-shortcut' }]
    : shortcuts;

  return (
    <div className="computer-desktop" onClick={() => setSelected(null)}>
      <button className="return-room" type="button" onClick={(event) => { event.stopPropagation(); onExit(); }}>
        返回房间
      </button>

      <div className="desktop-shortcuts" aria-label="电脑桌面快捷方式">
        {dynamicShortcuts.map((shortcut) => {
          const complete = shortcut.id === 'wechat'
            ? progress.wechatComplete
            : shortcut.id === 'recycle-bin' ? progress.letterOpened : false;
          return (
            <button
              key={shortcut.id}
              type="button"
              className={`desktop-shortcut ${shortcut.className ?? ''} ${selected === shortcut.id ? 'is-selected' : ''}`}
              aria-label={`打开 ${shortcut.label}`}
              onClick={(event) => { event.stopPropagation(); setSelected(shortcut.id); }}
              onDoubleClick={(event) => { event.stopPropagation(); openShortcut(shortcut.id); }}
            >
              {shortcut.image ? (
                <img src={shortcut.image} alt="" draggable={false} />
              ) : (
                <span className="memory-file-icon" aria-hidden="true"><i /></span>
              )}
              <span>{shortcut.label}</span>
              {complete && <i className="desktop-complete-mark" aria-label="已完成">✓</i>}
            </button>
          );
        })}
      </div>

      <p className="desktop-doubleclick-tip">双击图标打开</p>
      {notice > 0 && (
        <aside className="xp-toast" role="status" aria-live="polite">
          <span className="xp-toast-logo" aria-hidden="true">▦</span>
          <div>
            <strong>{notice === 1 ? '今日任务已完成。' : '生日快乐，何女士。'}</strong>
            <small>Yttralooo.XP</small>
          </div>
        </aside>
      )}
    </div>
  );
}
