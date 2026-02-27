// src/app/dashboard/nurse/independent/layout.tsx
// ═══════════════════════════════════════════════════════════
// ASHIRA — Layout del Panel de Enfermería Independiente
// ═══════════════════════════════════════════════════════════
import { redirect } from 'next/navigation';
import { getCurrentNurseProfileSSR } from '@/lib/auth/nurse-auth-server';
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
    redirect('/login?redirect=/dashboard/nurse/independent');
  }

  if (nurseSession.nurseType !== 'independent') {
    redirect('/dashboard/nurse');
  }

  return (
    <NurseProvider userId={nurseSession.userId}>
      {children}
    </NurseProvider>
  );
}
