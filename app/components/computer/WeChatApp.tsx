import { useEffect, useRef, useState, type CSSProperties } from 'react';
import XPWindow from './XPWindow';
import { playComputerSound } from './computerAudio';
import { chatOptions, type ChatStage } from './wechatScript';
import type { ChatMessage } from './types';

type WeChatAppProps = {
  completed: boolean;
  savedHistory: ChatMessage[];
  onClose: () => void;
  onComplete: (history: ChatMessage[]) => void;
};

type ScriptLine = { sender?: 'yt' | 'me' | 'system'; text: string; pause?: number };

const optionLabels = ['A', 'B', 'C'];
const cakeRain = ['🎂', '🍰', '🧁', '🍓', '🎉', '🎂', '🍰', '✨', '🧁', '🍓', '🎂', '🎉', '🍰', '✨', '🎂', '🧁', '🍓', '🍰', '🎉', '🎂', '✨', '🍰', '🧁', '🎂'];

export default function WeChatApp({ completed, savedHistory, onClose, onComplete }: WeChatAppProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => completed && savedHistory.length
    ? savedHistory
    : [{ id: 'hello', sender: 'yt', text: '研究生开学感觉怎么样' }]);
  const [stage, setStage] = useState<ChatStage>(completed ? 'done' : 'feel');
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef(messages);
  const aliveRef = useRef(true);
  const timersRef = useRef<number[]>([]);
  const messageIdRef = useRef(messages.length);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => () => {
    aliveRef.current = false;
    timersRef.current.forEach(window.clearTimeout);
  }, []);

  const wait = (duration: number) => new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, duration);
    timersRef.current.push(timer);
  });

  const append = (sender: ChatMessage['sender'], text: string) => {
    if (!aliveRef.current) return;
    if (sender === 'yt') playComputerSound('message');
    if (sender === 'system') playComputerSound('success');
    messageIdRef.current += 1;
    const message = { id: `chat-${messageIdRef.current}`, sender, text };
    const next = [...messagesRef.current, message];
    messagesRef.current = next;
    setMessages(next);
  };

  const runReply = async (lines: ScriptLine[], nextStage: ChatStage, onDone?: () => void) => {
    setBusy(true);
    await wait(420);
    if (!aliveRef.current) return;
    setTyping(true);
    await wait(1650);
    if (!aliveRef.current) return;
    setTyping(false);
    for (const line of lines) {
      append(line.sender ?? 'yt', line.text);
      await wait(line.pause ?? 290);
      if (!aliveRef.current) return;
    }
    setStage(nextStage);
    setBusy(false);
    onDone?.();
  };

  const startBlessing = () => runReply([
    { text: '好了 不闹了' },
    { text: '生日快乐', pause: 1000 },
    { text: '研究生生活才刚开始' },
    { text: '希望你能遇到很好的人，也能碰到很多好玩的事' },
    { text: '想做的事情都慢慢去做' },
    { text: '不开心的时候也不用硬撑着装没事', pause: 1500 },
    { text: '以及' },
    { text: '不许读了研就把我忘了' },
  ], 'promise');

  const choose = async (option: string, index: number) => {
    if (busy || stage === 'done') return;
    append('me', option);

    if (stage === 'feel') {
      const branches: ScriptLine[][] = [
        [{ text: '哦哟' }, { text: '看来新生活暂时还没毒打你' }],
        [{ text: '装' }, { text: '我不信你一点内心戏都没有' }],
        [{ text: '?' }, { text: '学费交了吗' }, { sender: 'me', text: '交了' }, { text: '那不准退' }, { text: '钱都花了 给我读' }],
      ];
      runReply([...branches[index], { text: '不过说真的' }, { text: '新学校还习惯吗' }], 'habit');
      return;
    }

    if (stage === 'habit') {
      const branches: ScriptLine[][] = [
        [{ text: '那就好' }, { text: '先慢慢把新地图走熟' }],
        [{ text: '一般般也算顺利开局' }, { text: '至少还没被学校劝退' }],
        [{ text: '行' }, { text: '研究生读了几天开始有秘密了' }],
      ];
      runReply([...branches[index], { text: '那你最近什么打算' }], 'plans');
      return;
    }

    if (stage === 'plans') {
      const branches: ScriptLine[][] = [
        [{ text: '截图了' }, { text: '下次你跟我说不想学习我就把这句话发回来' }],
        [{ text: '这个批准' }, { text: '吃好睡好玩好' }, { text: '顺便读个研' }],
        [{ text: '很有志向' }, { text: '建议写进研究生培养计划' }],
      ];
      runReply([...branches[index], { text: '还有呢' }], 'more');
      return;
    }

    if (stage === 'more') {
      const prefaces = ['这个很重要', '地图记得发我一份', '不知道也没事'];
      runReply([{ text: prefaces[index] }, { text: '可以' }, { text: '反正别把自己活成实验室耗材', pause: 700 },
        { text: '等等', pause: 500 }, { text: '我是不是忘了什么', pause: 1000 }, { text: '哦' }, { text: '今天好像有个人生日' }], 'birthday');
      return;
    }

    if (stage === 'birthday') {
      const branches: ScriptLine[][] = [
        [{ text: '一个姓何的' }, { text: '年龄又加一' }, { text: '听说还挺漂亮' }],
        [{ text: '什么叫终于' }, { text: '我这是精确卡点进入生日主线' }],
        [{ text: '好' }, { text: '那生日礼物省了', pause: 550 }, { text: '开玩笑的' }, { text: '想得美' }],
      ];
      runReply([...branches[index], { text: '对了' }, { text: '问你个严肃的问题', pause: 550 }, { text: '你想不想我' }], 'miss');
      return;
    }

    if (stage === 'miss' && index === 0) {
      runReply([{ text: '就‘想’？' }, { text: '重选' }], 'miss-retry');
      return;
    }

    if (stage === 'miss' || stage === 'miss-retry') {
      const strong = stage === 'miss-retry' ? index >= 1 : index === 2;
      const reply = strong
        ? [{ text: '知道了知道了' }, { text: '别这么爱我' }]
        : [{ text: '嗯' }, { text: '这个答案勉强及格' }];
      runReply([...reply, { sender: 'me', text: '?' }, { text: '系统自动帮你回复的' }, { text: '与本人无关' }], 'done', startBlessing);
      return;
    }

    if (stage === 'promise') {
      runReply([
        { text: '已截图' }, { text: '具有法律效力' }, { text: '好啦' }, { text: '新的一岁也请多关照' },
        { sender: 'system', text: 'yt 拍了拍我，并提醒你今天要开心' },
      ], 'done', () => onComplete(messagesRef.current));
    }
  };

  const options = stage === 'done' ? [] : chatOptions[stage];

  return (
    <XPWindow title="微信" icon="●" onClose={onClose} className="wechat-window">
      <div className="wechat-layout">
        <aside className="wechat-rail">
          <span className="wechat-me-avatar">何</span>
          <button type="button" aria-label="聊天">▣</button>
          <button type="button" aria-label="联系人">♟</button>
          <i />
          <button type="button" aria-label="菜单">☰</button>
        </aside>
        <aside className="wechat-contacts">
          <div className="wechat-search">🔍 搜索</div>
          <button type="button" className="is-active">
            <span className="yt-avatar-code">yt</span>
            <span><strong>yt</strong><small>{completed ? '生日快乐，何女士。' : '研究生开学感觉怎么样'}</small></span>
          </button>
        </aside>
        <section className="wechat-chat">
          <header>yt</header>
          {stage === 'done' && !busy && (
            <div className="wechat-cake-rain" aria-hidden="true">
              {cakeRain.map((emoji, index) => (
                <span
                  key={`${emoji}-${index}`}
                  style={{
                    '--cake-x': `${2 + ((index * 37) % 94)}%`,
                    '--cake-delay': `${(index % 8) * 0.11}s`,
                    '--cake-duration': `${1.4 + (index % 5) * 0.12}s`,
                    '--cake-rotate': `${index % 2 === 0 ? 260 : -240}deg`,
                  } as CSSProperties}
                >{emoji}</span>
              ))}
            </div>
          )}
          <div className="wechat-messages" ref={chatRef}>
            {messages.map((message) => message.sender === 'system' ? (
              <p className="wechat-system" key={message.id}>{message.text}</p>
            ) : (
              <div className={`wechat-message is-${message.sender}`} key={message.id}>
                <span className={message.sender === 'yt' ? 'yt-avatar-code' : 'wechat-me-avatar'}>{message.sender === 'yt' ? 'yt' : '何'}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {typing && <p className="wechat-typing">对方正在输入<span>……</span></p>}
          </div>
          {!busy && options.length > 0 && (
            <div className="wechat-options">
              {options.map((option, index) => (
                <button type="button" key={option} onClick={() => choose(option, index)}>
                  <b>{optionLabels[index]}</b>{option}
                </button>
              ))}
            </div>
          )}
          {stage === 'done' && !busy && <div className="wechat-chat-finished">聊天已结束 · 可以向上滚动查看记录</div>}
        </section>
      </div>
    </XPWindow>
  );
}
