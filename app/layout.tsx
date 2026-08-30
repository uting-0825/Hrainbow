import type { Metadata } from 'next';
import './globals.css';
import './computer.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://xiao-run-memory-room.uting0825.workers.dev'),
  title: '给小润的回忆书房',
  description: '一间收藏旅行、游戏、音乐与陪伴的水彩生日书房。',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    title: '给小润的回忆书房',
    description: '一间收藏旅行、游戏、音乐与陪伴的水彩生日书房。',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: '给小润的回忆书房水彩封面' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '给小润的回忆书房',
    description: '一间收藏旅行、游戏、音乐与陪伴的水彩生日书房。',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
