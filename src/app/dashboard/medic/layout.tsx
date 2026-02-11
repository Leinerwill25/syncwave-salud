// app/dashboard/medic/layout.tsx
import React from 'react';
import MedicSidebar from '../medic/components/MedicSidebar';
import MedicAdvancedToolsSidebar from '../medic/components/MedicAdvancedToolsSidebar';
import MedicHamburgerMenu from '@/components/medic/MedicHamburgerMenu';
import ServerDashboardGuard from '@/components/auth/ServerDashboardGuard';
import AlertsButton from '@/components/medic/AlertsButton';
import ProfileCompleteGuard from '@/components/medic/ProfileCompleteGuard';
import { LiteModeProvider } from '@/contexts/LiteModeContext';

// Usar renderizado dinámico solo cuando sea necesario
// Las páginas individuales pueden sobrescribir esto si necesitan datos dinámicos
export const dynamic = 'auto';

export const metadata = {
	title: 'Dashboard — Medico',
};

export default function MedicLayout({ children }: { children: React.ReactNode }) {
	return (
		<ServerDashboardGuard allowedRoles={['MEDICO']}>
			<ProfileCompleteGuard>
				<LiteModeProvider>
					<div className="min-h-screen rounded-2xl bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 w-full max-w-full overflow-x-hidden relative">
						{/* Menú Hamburger para móviles */}
						<MedicHamburgerMenu />

						<div className="w-full max-w-7xl mx-auto p-4 md:p-6 pt-16 md:pt-4 min-w-0 overflow-x-hidden">
							<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start w-full min-w-0">
								<MedicSidebar />

								<div className="flex flex-col gap-4 w-full min-w-0 overflow-x-hidden">
									<main className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 flex-1 w-full min-w-0 overflow-x-hidden">{children}</main>
								</div>
							</div>

							{/* Panel de Herramientas Avanzadas (Derecha) */}
							<MedicAdvancedToolsSidebar />

							{/* Botón de Alertas - Burbuja flotante */}
							<div className="fixed bottom-6 right-6 z-50">
								<AlertsButton />
							</div>
						</div>
					</div>
				</LiteModeProvider>
			</ProfileCompleteGuard>
		</ServerDashboardGuard>
	);
}
