// src/app/nurse/independent/layout.tsx
// ═══════════════════════════════════════════════════════════
// ASHIRA — Layout del Panel de Enfermería Independiente
// ═══════════════════════════════════════════════════════════
import { redirect } from 'next/navigation';
import { getCurrentNurseProfileSSR } from '@/lib/auth/nurse-redirect';
import { NurseProvider } from '@/context/NurseContext';
import { NurseSidebar } from '@/components/nurse/layout/NurseSidebar';
import { NurseTopBar } from '@/components/nurse/layout/NurseTopBar';
import { NurseAlertPanel } from '@/components/nurse/layout/NurseAlertPanel';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panel Independiente — ASHIRA',
  description: 'Panel de enfermería independiente ASHIRA Software',
};

import { NurseGlobalReminders } from '@/components/nurse/NurseGlobalReminders';

export default async function NurseIndependentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nurseSession = await getCurrentNurseProfileSSR();

  if (!nurseSession) {
    redirect('/login?redirect=/nurse/independent/dashboard');
  }

  if (nurseSession.nurseType !== 'independent') {
    redirect('/nurse/dashboard');
  }

  return (
    <NurseProvider userId={nurseSession.nurseProfileId}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <NurseSidebar nurseType="independent" />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <NurseTopBar />
          <main className="flex-1 overflow-y-auto p-6 relative">
            {children}
            <NurseGlobalReminders />
          </main>
        </div>
        <NurseAlertPanel />
      </div>
    </NurseProvider>
  );
}
