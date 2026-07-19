import type { ReactNode } from 'react';
import { DashNav } from '@/components/DashNav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashNav />
      {children}
    </>
  );
}
