export type ComputerApp = 'desktop' | 'steam' | 'wechat' | 'recycle-bin' | 'memory';

export type SteamView = 'library' | 'farm' | 'kitchen' | 'puzzle';

export type ChatMessage = {
  id: string;
  sender: 'yt' | 'me' | 'system';
  text: string;
};

export type ComputerProgress = {
  farmComplete: boolean;
  kitchenComplete: boolean;
  puzzleComplete: boolean;
  memorySaved: boolean;
  wechatComplete: boolean;
  wechatHistory: ChatMessage[];
  letterOpened: boolean;
  notificationShown: boolean;
};

export const defaultComputerProgress: ComputerProgress = {
  farmComplete: false,
  kitchenComplete: false,
  puzzleComplete: false,
  memorySaved: false,
  wechatComplete: false,
  wechatHistory: [],
  letterOpened: false,
  notificationShown: false,
};

export const COMPUTER_STATE_KEY = 'birthday-computer-state';

