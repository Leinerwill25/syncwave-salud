// app/dashboard/medic/layout.tsx
import React from 'react';
import MedicSidebar from '../medic/components/MedicSidebar';
import ServerDashboardGuard from '@/components/auth/ServerDashboardGuard';
import AlertsButton from '@/components/medic/AlertsButton';

export const metadata = {
	title: 'Dashboard — Medico',
};

export default function MedicLayout({ children }: { children: React.ReactNode }) {
	return (
		<ServerDashboardGuard allowedRoles={['MEDICO']}>
			<div className="min-h-screen rounded-2xl bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
				<div className="max-w-7xl mx-auto p-4 md:p-6">
					<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
						<MedicSidebar />

						<div className="flex flex-col gap-4">
							<main className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 flex-1">{children}</main>
						</div>
					</div>

					{/* Botón de Alertas - Burbuja flotante */}
					<div className="fixed bottom-6 right-6 z-50">
						<AlertsButton />
					</div>
				</div>
			</div>
		</ServerDashboardGuard>
	);
}
