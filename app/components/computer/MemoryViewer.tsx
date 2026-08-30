import XPWindow from './XPWindow';

export default function MemoryViewer({ onClose }: { onClose: () => void }) {
  return (
    <XPWindow title="memory.jpg - 图片和传真查看器" icon="▧" onClose={onClose} className="memory-viewer-window">
      <div className="memory-viewer-canvas">
        <img src="/assets/computer/steam/puzzle/memory.jpg" alt="何女士的记忆照片" />
      </div>
      <footer className="memory-viewer-toolbar"><button type="button" onClick={onClose}>← 返回桌面</button><span>100%</span></footer>
    </XPWindow>
  );
}

