import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '青岚问仙：藏锋',
  description: '父亲失踪十年后，他的剑在河底敲了三下。小人物成长、选择留痕的中文修仙互动小说试玩。',
  openGraph: {
    title: '青岚问仙：藏锋',
    description: '父亲失踪十年以后，他的剑在河底敲了三下。',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '青岚问仙：藏锋',
    description: '父亲失踪十年以后，他的剑在河底敲了三下。',
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
