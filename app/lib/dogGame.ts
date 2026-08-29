export type DogStage = 'puppy' | 'teen' | 'adult';
export type DogAction = 'eat' | 'play' | 'bath' | 'sleep';
export type AdultType = 'princess' | 'elegant' | 'athletic' | 'foodie' | 'chubby' | 'stray' | 'normal';
export type IdleFrame = 'idle_left_01' | 'idle_left_02' | 'idle_front' | 'idle_right_01' | 'idle_right_02';

export type HiddenDogStats = {
  foodCount: number;
  playCount: number;
  cleanCount: number;
  sleepCount: number;
  totalActions: number;
};

export type VisibleDogStats = {
  food: number;
  happiness: number;
  clean: number;
  rest: number;
};

const DOG_ASSET_ROOT = '/assets/dog';

function stageSprites(stage: Exclude<DogStage, 'adult'>) {
  const sprite = (name: string) => `${DOG_ASSET_ROOT}/${stage}/${stage}_${name}.png`;
  return {
    idle: {
      idle_left_01: sprite('idle_left_01'),
      idle_left_02: sprite('idle_left_02'),
      idle_front: sprite('idle_front'),
      idle_right_01: sprite('idle_right_01'),
      idle_right_02: sprite('idle_right_02'),
    } satisfies Record<IdleFrame, string>,
    actions: {
      eat: [sprite('eat_01'), sprite('eat_02')],
      play: [sprite('play_01'), sprite('play_02')],
      bath: [sprite('bath_01'), sprite('bath_02')],
      sleep: [sprite('sleep_01'), sprite('sleep_02')],
    } satisfies Record<DogAction, [string, string]>,
  };
}

export const DOG_SPRITES = {
  puppy: stageSprites('puppy'),
  teen: stageSprites('teen'),
  adult: {
    chubby: `${DOG_ASSET_ROOT}/adult/adult_chubby.png`,
    foodie: `${DOG_ASSET_ROOT}/adult/adult_foodie.png`,
    athletic: `${DOG_ASSET_ROOT}/adult/adult_athletic.png`,
    elegant: `${DOG_ASSET_ROOT}/adult/adult_elegant.png`,
    stray: `${DOG_ASSET_ROOT}/adult/adult_stray.png`,
    normal: `${DOG_ASSET_ROOT}/adult/adult_normal.png`,
    princess: `${DOG_ASSET_ROOT}/adult/adult_princess.png`,
  } satisfies Record<AdultType, string>,
} as const;

export const INITIAL_HIDDEN_STATS: HiddenDogStats = {
  foodCount: 0,
  playCount: 0,
  cleanCount: 0,
  sleepCount: 0,
  totalActions: 0,
};

export const INITIAL_VISIBLE_STATS: VisibleDogStats = {
  food: 3,
  happiness: 3,
  clean: 3,
  rest: 3,
};

export const ACTION_CONFIG: Record<DogAction, {
  label: string;
  english: string;
  icon: string;
  cycles: number;
  frameMs: number;
  feedback: string;
}> = {
  eat: { label: '喂食', english: 'FEED', icon: '▤', cycles: 3, frameMs: 280, feedback: '吃得饱饱的！' },
  play: { label: '玩球', english: 'PLAY', icon: '●', cycles: 4, frameMs: 220, feedback: '今天也玩得很开心！' },
  bath: { label: '洗澡', english: 'BATH', icon: '✦', cycles: 3, frameMs: 300, feedback: '毛毛变得香喷喷～' },
  sleep: { label: '睡觉', english: 'SLEEP', icon: 'Zz', cycles: 2, frameMs: 500, feedback: '做了一个软绵绵的梦。' },
};

export const ADULT_RESULTS: Record<AdultType, { name: string; description: string }> = {
  chubby: { name: '胖乎乎金毛', description: '最大的梦想，是吃饱以后再睡一觉。' },
  foodie: { name: '吃货金毛', description: '这个世界上大概没有它拒绝的饭。' },
  athletic: { name: '运动型金毛', description: '球在哪，它就在哪。' },
  elegant: { name: '精致金毛', description: '今天的毛，也必须蓬蓬松松。' },
  stray: { name: '流浪汉金毛', description: '虽然有点乱，但依然活得很自在。' },
  normal: { name: '普通乖狗狗', description: '平平淡淡地长成了一只很好很好的狗。' },
  princess: { name: '公主金毛', description: '被认真爱大的小狗，会闪闪发光。' },
};

export const ADULT_HINTS: Array<{ type: AdultType; condition: string }> = [
  { type: 'princess', condition: '喂食 ≥ 3、玩球 ≥ 3、洗澡 ≥ 3，且三项最大差值 ≤ 2' },
  { type: 'elegant', condition: '洗澡 ≥ 4，严格高于其他三项，且比喂食或玩球中的较低项至少多 2' },
  { type: 'athletic', condition: '玩球 ≥ 4、喂食 ≥ 2，并且玩球次数 > 喂食次数' },
  { type: 'foodie', condition: '喂食 ≥ 5、玩球 ≥ 2，且喂食比其他任一项至少多 2' },
  { type: 'chubby', condition: '喂食 ≥ 4，并且玩球 ≤ 1' },
  { type: 'stray', condition: '洗澡 = 0 且喂食 + 玩球 ≤ 4；或任一操作 ≥ 8 且喂食 + 洗澡 ≤ 2' },
  { type: 'normal', condition: '完成任意 10 次操作，但没有命中以上六种数值组合' },
];

const clamp = (value: number) => Math.max(1, Math.min(5, value));

export function applyDogAction(
  action: DogAction,
  hidden: HiddenDogStats,
  visible: VisibleDogStats,
): { hidden: HiddenDogStats; visible: VisibleDogStats } {
  const nextHidden = { ...hidden, totalActions: hidden.totalActions + 1 };
  const nextVisible = { ...visible };

  if (action === 'eat') {
    nextHidden.foodCount += 1;
    nextVisible.food = clamp(visible.food + 1);
    nextVisible.happiness = clamp(visible.happiness + 1);
  } else if (action === 'play') {
    nextHidden.playCount += 1;
    nextVisible.happiness = clamp(visible.happiness + 1);
    nextVisible.food = clamp(visible.food - 1);
    nextVisible.rest = clamp(visible.rest - 1);
  } else if (action === 'bath') {
    nextHidden.cleanCount += 1;
    nextVisible.clean = clamp(visible.clean + 1);
  } else {
    nextHidden.sleepCount += 1;
    nextVisible.rest = clamp(visible.rest + 1);
    nextVisible.food = clamp(visible.food - 1);
  }

  return { hidden: nextHidden, visible: nextVisible };
}

export function determineAdultType(stats: HiddenDogStats): AdultType {
  const { foodCount: food, playCount: play, cleanCount: clean, sleepCount: sleep } = stats;
  const careCounts = [food, play, clean];
  const careSpread = Math.max(...careCounts) - Math.min(...careCounts);

  if (food >= 3 && play >= 3 && clean >= 3 && careSpread <= 2) return 'princess';

  const highestOther = Math.max(food, play, sleep);
  if (clean >= 4 && clean > highestOther && clean - Math.min(food, play) >= 2) return 'elegant';

  if (play >= 4 && food >= 2 && play > food) return 'athletic';

  const highestNonFood = Math.max(play, clean, sleep);
  if (food >= 5 && play >= 2 && food >= highestNonFood + 2) return 'foodie';

  if (food >= 4 && play <= 1) return 'chubby';

  const mostRepeatedAction = Math.max(food, play, clean, sleep);
  const lacksBasicCare = clean === 0 && food + play <= 4;
  const extremelySingle = mostRepeatedAction >= 8 && food + clean <= 2;
  if (lacksBasicCare || extremelySingle) return 'stray';

  return 'normal';
}
