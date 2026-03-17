import React from 'react';
import { AdministrationSidebar } from '@/components/administration/AdministrationSidebar';
import { requireRole } from '@/lib/auth-guards';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Administración ASHIRA',
  description: 'Panel de control para administradores de clínicas en la red ASHIRA.',
};

import { MobileBottomNav } from '@/components/administration/MobileBottomNav';
import CurrencyFloatingWidget from '@/components/clinic/CurrencyFloatingWidget';

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
    <div className="flex bg-[#F8FAFC] min-h-screen">
      <div className="flex-shrink-0">
        <AdministrationSidebar />
      </div>
      <main className="flex-1 w-full flex flex-col pt-20 md:pt-6 pb-24 md:pb-6 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
      <MobileBottomNav />
      <CurrencyFloatingWidget />
    </div>
  );
}
