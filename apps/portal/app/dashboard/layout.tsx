import type { ReactNode } from 'react';
import { DashNav } from '@/components/DashNav';
import { FirstVisitBanner } from '@/components/FirstVisitBanner';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashNav />
      <FirstVisitBanner />
      {children}
    </>
  );
}
