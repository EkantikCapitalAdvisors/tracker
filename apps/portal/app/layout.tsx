import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ekantik Research Portal',
  description: 'Ekantik Capital Advisors — internal research systems',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
