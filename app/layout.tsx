import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://swxwz.github.io/jinggu-xueqi-demo/'),
  title: '春山听火｜茶业悬疑互动小说',
  description: '十二天后，听雨坪将进入债务处置。做成一笔春茶订单，也说清三年前那次换样。',
  openGraph: {
    title: '春山听火',
    description: '一笔欠薪，一份收购合同，一袋由你亲手换过的茶样。',
    type: 'website',
    images: [{ url: './og.png', width: 1731, height: 907, alt: '春山听火：当代茶业互动小说' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '春山听火',
    description: '一笔欠薪，一份收购合同，一袋由你亲手换过的茶样。',
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
