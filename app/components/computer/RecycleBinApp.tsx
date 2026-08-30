import { useEffect, useState } from 'react';
import XPWindow from './XPWindow';
import { playComputerSound } from './computerAudio';

type RecycleBinAppProps = { onClose: () => void; onLetterOpened: () => void };
type RecycleView = 'root' | 'folder' | 'letter';

const fakeFiles = [
  { name: 'final_final_真的final.docx', icon: '📄' },
  { name: '不要看.txt', icon: '📄' },
  { name: 'IMG_825.jpg', icon: '🖼️' },
  { name: '作业.zip', icon: '🗜️' },
];

export default function RecycleBinApp({ onClose, onLetterOpened }: RecycleBinAppProps) {
  const [view, setView] = useState<RecycleView>('root');
  const [warning, setWarning] = useState<0 | 1 | 2 | 3>(0);
  const [thirdText, setThirdText] = useState('……');
  const [letter, setLetter] = useState('正在读取 birthday_letter.txt……');

  useEffect(() => {
    if (warning !== 3) return;
    const timer = window.setTimeout(() => setThirdText('行。'), 1000);
    return () => window.clearTimeout(timer);
  }, [warning]);

  useEffect(() => {
    if (view !== 'letter') return;
    let active = true;
    fetch('/assets/computer/recycle-bin/letter.txt')
      .then((response) => {
        if (!response.ok) throw new Error('letter unavailable');
        return response.text();
      })
      .then((text) => { if (active) setLetter(text); })
      .catch(() => { if (active) setLetter('信件暂时读取失败，请关闭后重试。'); });
    onLetterOpened();
    playComputerSound('success');
    return () => { active = false; };
  }, [onLetterOpened, view]);

  if (view === 'letter') {
    return (
      <XPWindow title="birthday_letter.txt - 记事本" icon="📄" onClose={() => setView('folder')} className="notepad-window">
        <div className="notepad-menu"><span>文件</span><span>编辑</span><span>格式</span><span>查看</span><span>帮助</span></div>
        <pre className="notepad-content">{letter}</pre>
        <footer><button type="button" onClick={() => setView('folder')}>关闭</button></footer>
      </XPWindow>
    );
  }

  return (
    <XPWindow title={view === 'root' ? '回收站' : '不要打开'} icon="♻" onClose={onClose} className="recycle-window">
      <div className="explorer-toolbar">
        <button type="button" onClick={() => view === 'folder' ? setView('root') : undefined}>← 后退</button>
        <span>地址</span>
        <div>C:\回收站{view === 'folder' ? '\不要打开' : ''}</div>
      </div>
      <div className="explorer-layout">
        <aside>
          <strong>文件和文件夹任务</strong>
          <p>把这些东西删掉之前，最好再想一下。</p>
        </aside>
        <div className="explorer-files">
          {view === 'root' && (
            <>
              {fakeFiles.map((file) => (
                <button type="button" key={file.name} onDoubleClick={() => undefined}>
                  <span>{file.icon}</span><small>{file.name}</small>
                </button>
              ))}
              <button type="button" className="forbidden-folder" onDoubleClick={() => setWarning(1)}>
                <span>📁</span><small>不要打开</small>
              </button>
            </>
          )}
          {view === 'folder' && (
            <button type="button" onDoubleClick={() => setView('letter')}>
              <span>📄</span><small>birthday_letter.txt</small>
            </button>
          )}
        </div>
      </div>

      {warning > 0 && (
        <div className="xp-prompt-layer">
          <div className="xp-prompt recycle-warning">
            <header>回收站</header>
            {warning === 1 && (
              <><p>确定要打开吗？</p><div><button type="button" onClick={() => setWarning(0)}>取消</button><button type="button" onClick={() => { playComputerSound('error'); setWarning(2); }}>打开</button></div></>
            )}
            {warning === 2 && (
              <><p>我说了不要打开。</p><div><button type="button" onClick={() => setWarning(0)}>知道了</button><button type="button" onClick={() => { playComputerSound('chaos'); setThirdText('……'); setWarning(3); }}>我偏要</button></div></>
            )}
            {warning === 3 && (
              <><p className="warning-ellipsis">{thirdText}</p>{thirdText === '行。' && <button type="button" onClick={() => { setWarning(0); setView('folder'); }}>打开</button>}</>
            )}
          </div>
        </div>
      )}
    </XPWindow>
  );
}
