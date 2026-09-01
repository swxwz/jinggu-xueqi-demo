import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '青岚问仙：藏锋',
  description: '小人物成长、选择留痕的中文修仙互动小说试玩。',
  openGraph: {
    title: '青岚问仙：藏锋',
    description: '所有人都以为你没有灵根，只有她看见，你提前收了手。',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '青岚问仙：藏锋',
    description: '所有人都以为你没有灵根，只有她看见，你提前收了手。',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
