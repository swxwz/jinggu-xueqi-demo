import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://swxwz.github.io/jinggu-xueqi-demo/'),
  title: '春山听火｜茶业悬疑互动小说',
  description: '拍卖杯里出现了三年前的旧火香。沿批次、封样与一场将至的仓火，替陆闻川决定茶园和下一年春茶。',
  openGraph: {
    title: '春山听火',
    description: '那批让你身败名裂的茶，又在拍卖杯里出现了。',
    type: 'website',
    images: [{ url: './og.png', width: 1731, height: 907, alt: '春山听火：一缕旧火香，三十天，七种去路' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '春山听火',
    description: '那批让你身败名裂的茶，又在拍卖杯里出现了。',
    images: ['./og.png'],
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
