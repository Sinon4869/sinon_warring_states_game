import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sinon Warring States Game',
  description: 'Sengoku strategy web game with multi-faction AI.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
