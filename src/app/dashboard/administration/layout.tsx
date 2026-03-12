import React from 'react';
import { AdministrationSidebar } from '@/components/administration/AdministrationSidebar';
import { requireRole } from '@/lib/auth-guards';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Administración ASHIRA',
  description: 'Panel de control para administradores de clínicas en la red ASHIRA.',
};

export default async function AdministrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect all administration routes
  const user = await requireRole(['ADMINISTRACION', 'ADMIN']);
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <AdministrationSidebar />
      <main className="flex-1 w-full overflow-hidden flex flex-col pt-16 md:pt-0">
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
