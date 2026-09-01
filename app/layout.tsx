import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '烬骨录：血契入门',
  description: '一部强制推进、选择留痕的中文修仙互动小说试玩。',
  openGraph: {
    title: '烬骨录：血契入门',
    description: '山门择徒，也择一副最合适的骨头。中文修仙互动小说试玩。',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '烬骨录：血契入门',
    description: '山门择徒，也择一副最合适的骨头。中文修仙互动小说试玩。',
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
