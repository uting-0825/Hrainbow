import type { Metadata } from 'next';
import './globals.css';
import './computer.css';

export const metadata: Metadata = {
  title: '给小润的回忆书房',
  description: '一间收藏旅行、游戏、音乐与陪伴的水彩生日书房。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
