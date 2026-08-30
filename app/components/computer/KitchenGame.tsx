import { useState } from 'react';
import { playComputerSound } from './computerAudio';

type KitchenGameProps = { onExit: () => void; onComplete: () => void };
type KitchenStep = 'select' | 'cut' | 'cook' | 'serve' | 'done';
type Mishap = { icon: string; text: string; action: string };

const orders = [
  { name: '沙拉', result: '🥗', ingredients: ['🍅', '🥬'] },
  { name: '简单三明治', result: '🥪', ingredients: ['🍞', '🥚'] },
  { name: '奇怪炖菜', result: '🍲', ingredients: ['🥔', '🥩'] },
  { name: '何女士生日限定订单', result: '🎂', ingredients: ['🍰', '🥛', '🍓', '🕯️'] },
] as const;

const pantry = [
  { emoji: '🍅', label: '番茄' }, { emoji: '🥬', label: '生菜' }, { emoji: '🍞', label: '面包' },
  { emoji: '🥚', label: '鸡蛋' }, { emoji: '🥔', label: '土豆' }, { emoji: '🥩', label: '肉' },
  { emoji: '🍰', label: '蛋糕胚' }, { emoji: '🥛', label: '奶油' }, { emoji: '🍓', label: '草莓' },
  { emoji: '🕯️', label: '蜡烛' },
];

export default function KitchenGame({ onExit, onComplete }: KitchenGameProps) {
  const [orderIndex, setOrderIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<KitchenStep>('select');
  const [feedback, setFeedback] = useState('按订单选择食材，然后切菜。');
  const [showYtReview, setShowYtReview] = useState(false);
  const [mishap, setMishap] = useState<Mishap | null>(null);
  const order = orders[orderIndex];
  const matches = selected.length === order.ingredients.length
    && order.ingredients.every((ingredient) => selected.includes(ingredient));

  const toggleIngredient = (ingredient: string) => {
    if (step !== 'select') return;
    setSelected((current) => current.includes(ingredient)
      ? current.filter((item) => item !== ingredient)
      : [...current, ingredient]);
  };

  const cut = () => {
    if (!matches) {
      playComputerSound('error');
      setFeedback('这能吃吗？食材已经自动退回。');
      setSelected([]);
      return;
    }
    setStep('cut');
    setFeedback('咔嚓咔嚓——切好了。');
    const cutMishaps: Array<Mishap | null> = [
      null,
      { icon: '🥬', text: '生菜突然从案板上逃跑了！', action: '抓回来' },
      { icon: '🔪', text: '刀卡在案板里了。场面一度十分专业。', action: '拔出来' },
      { icon: '🍓', text: '草莓滚到地上了，五秒规则启动！', action: '捡回来' },
    ];
    if (cutMishaps[orderIndex]) {
      playComputerSound('chaos');
      setMishap(cutMishaps[orderIndex]);
    }
  };

  const cook = () => {
    setStep('cook');
    setFeedback(orderIndex === orders.length - 1 ? '小心地把蛋糕装饰好……' : '锅开始冒烟了，但问题不大。');
    const cookMishaps: Array<Mishap | null> = [
      null,
      null,
      { icon: '🍳', text: '锅盖起飞了！它正在挑战厨房天花板。', action: '接住锅盖' },
      { icon: '🕯️', text: '蜡烛提前点着了，奶油发出求救信号。', action: '吹灭重来' },
    ];
    if (cookMishaps[orderIndex]) {
      playComputerSound('chaos');
      setMishap(cookMishaps[orderIndex]);
    }
  };

  const serve = () => {
    setStep('serve');
    playComputerSound('success');
    setFeedback(`${order.name} 出餐成功！`);
    window.setTimeout(() => {
      if (orderIndex === orders.length - 1) {
        setStep('done');
        window.setTimeout(() => setShowYtReview(true), 850);
      } else {
        setOrderIndex((current) => current + 1);
        setSelected([]);
        setStep('select');
        setFeedback('新订单来了，动作快一点！');
      }
    }, 650);
  };

  const resolveMishap = () => {
    playComputerSound('success');
    setMishap(null);
    setFeedback('事故处理完毕。厨房仍在勉强运转。');
  };

  if (step === 'done') {
    return (
      <div className="kitchen-game kitchen-result game-screen">
        <span className="birthday-dish" aria-hidden="true">🎂</span>
        <h2>订单完成！</h2>
        <div className="kitchen-stars">★★★</div>
        <p>厨师评价：能吃。</p>
        {showYtReview && <p className="yt-review">yt评价：我没吃到，差评。</p>}
        {showYtReview && <button type="button" onClick={onComplete}>退出厨房</button>}
      </div>
    );
  }

  return (
    <div className={`kitchen-game game-screen chaos-${orderIndex} ${mishap ? 'has-mishap' : ''}`}>
      <div className="game-toolbar">
        <button type="button" onClick={onExit}>← 游戏库</button>
        <strong>胡闹厨房·贫穷版</strong>
        <span>{orderIndex + 1} / {orders.length}</span>
      </div>
      <section className="order-strip">
        <div>
          <small>当前订单</small>
          <strong>{order.name}</strong>
        </div>
        <div className="order-recipe">
          {order.ingredients.map((ingredient) => <span key={ingredient}>{ingredient}</span>)}
          <b>=</b><span>{order.result}</span>
        </div>
        <i className="order-timer" />
      </section>

      <div className="kitchen-chaos-meter" aria-label={`厨房混乱等级 ${orderIndex + 1}`}>
        <span>混乱值</span>
        {Array.from({ length: 4 }, (_, index) => <i key={index} className={index <= orderIndex ? 'is-lit' : ''} />)}
      </div>

      {orderIndex > 0 && (
        <div className="flying-orders" aria-hidden="true">
          <span>加急!</span><span>快点!</span><span>桌号?</span>
        </div>
      )}

      <div className="kitchen-stations">
        <article className={step === 'cut' ? 'is-active' : ''}><span>🔪</span><strong>案板</strong></article>
        <article className={step === 'cook' ? 'is-active is-smoking' : ''}><span>{orderIndex === 0 ? '🥣' : '🍳'}</span><strong>锅 / 盘子</strong></article>
        <article className={step === 'serve' ? 'is-active' : ''}><span>🛎️</span><strong>出餐口</strong></article>
      </div>

      <p className={`kitchen-feedback ${feedback.includes('这能吃吗') ? 'is-error' : ''}`}>{feedback}</p>
      <div className="kitchen-actions">
        <button type="button" disabled={step !== 'select'} onClick={cut}>1. 切菜</button>
        <button type="button" disabled={step !== 'cut' || Boolean(mishap)} onClick={cook}>2. 放入锅 / 盘</button>
        <button type="button" disabled={step !== 'cook' || Boolean(mishap)} onClick={serve}>3. 点击出餐</button>
      </div>

      <div className="ingredient-bin" aria-label="食材区">
        {pantry.map((item) => (
          <button
            type="button"
            key={item.emoji}
            className={selected.includes(item.emoji) ? 'is-selected' : ''}
            disabled={step !== 'select'}
            onClick={() => toggleIngredient(item.emoji)}
          >
            <span>{item.emoji}</span><small>{item.label}</small>
          </button>
        ))}
      </div>

      {mishap && (
        <div className="kitchen-mishap" role="alert">
          <span aria-hidden="true">{mishap.icon}</span>
          <div><strong>厨房事故！</strong><p>{mishap.text}</p></div>
          <button type="button" onClick={resolveMishap}>{mishap.action}</button>
        </div>
      )}
    </div>
  );
}
