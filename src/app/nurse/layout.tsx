// src/app/nurse/layout.tsx
// ═══════════════════════════════════════════════════════════
// ASHIRA — Layout raíz del Panel de Enfermería (Afiliada)
// Server Component: verifica autenticación y tipo enfermera.
// ═══════════════════════════════════════════════════════════
import { redirect } from 'next/navigation';
import { getCurrentNurseProfileSSR } from '@/lib/auth/nurse-auth-server';
import { NurseProvider } from '@/context/NurseContext';
import { NurseSidebar } from '@/components/nurse/layout/NurseSidebar';
import { NurseTopBar } from '@/components/nurse/layout/NurseTopBar';
import { NurseAlertPanel } from '@/components/nurse/layout/NurseAlertPanel';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panel de Enfermería — ASHIRA',
  description: 'Panel de gestión clínica para enfermeras ASHIRA Software',
};

import { NurseGlobalReminders } from '@/components/nurse/NurseGlobalReminders';

export default async function NurseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Guard SSR ──────────────────────────────────────────
  const nurseSession = await getCurrentNurseProfileSSR();

  if (!nurseSession) {
    redirect('/login?redirect=/nurse/dashboard');
  }

  // Las enfermeras independientes tienen su propio layout
  if (nurseSession.nurseType === 'independent') {
    redirect('/nurse/independent/dashboard');
  }

  return (
    <NurseProvider userId={nurseSession.nurseProfileId}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Sidebar */}
        <NurseSidebar nurseType="affiliated" />

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <NurseTopBar />
          <main className="flex-1 overflow-y-auto p-6 relative">
            {children}
            <NurseGlobalReminders />
          </main>
        </div>

        {/* Alert panel (collapsible right panel) */}
        <NurseAlertPanel />
      </div>
    </NurseProvider>
  );
}
