// app/dashboard/clinic/layout.tsx
import React from 'react';
import ClinicSidebar from '@/components/ClinicSidebar';
import ServerDashboardGuard from '@/components/auth/ServerDashboardGuard';

// Forzar renderizado dinámico ya que usa cookies para autenticación
export const dynamic = 'force-dynamic';

export const metadata = {
	title: 'Dashboard — Clínica',
};

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
	return (
		<ServerDashboardGuard allowedRoles={['ADMIN']}>
			<div className="min-h-screen bg-slate-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24 md:pt-[5.5rem]">
					<div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
						<ClinicSidebar />

						<main className="bg-white rounded-2xl p-6 shadow ">{children}</main>
					</div>
				</div>
			</div>
		</ServerDashboardGuard>
	);
}
