'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

interface MedicDashboardShellProps {
	children: React.ReactNode;
	sidebar: React.ReactNode;
	toolsSidebar: React.ReactNode;
	alertsButton: React.ReactNode;
	hamburgerMenu: React.ReactNode;
}

export default function MedicDashboardShell({
	children,
	sidebar,
	toolsSidebar,
	alertsButton,
	hamburgerMenu
}: MedicDashboardShellProps) {
	const pathname = usePathname();
	
	// Detectar si estamos en la pantalla de edición de consulta
	// El patrón es /dashboard/medic/consultas/[id]/edit
	const isEditConsultationPage = pathname?.includes('/consultas/') && pathname?.endsWith('/edit');

	if (isEditConsultationPage) {
		return (
			<div className="min-h-screen bg-slate-50 w-full overflow-x-hidden relative">
				<div className="w-full mx-auto p-0 min-w-0">
					<main className="w-full min-w-0">
						{children}
					</main>
				</div>

				{/* Botón de Alertas - Aunque sea modo enfoque, lo dejamos por seguridad pero más discreto */}
				<div className="fixed bottom-6 right-6 z-50 opacity-20 hover:opacity-100 transition-opacity">
					{alertsButton}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen rounded-2xl bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 w-full max-w-full overflow-x-hidden relative">
			{/* Menú Hamburger para móviles - Solo en modo normal */}
			{hamburgerMenu}

			<div className="w-full max-w-7xl mx-auto p-2 sm:p-4 md:p-6 pt-16 md:pt-4 min-w-0 overflow-x-hidden">
				<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start w-full min-w-0">
					{sidebar}

					<div className="flex flex-col gap-4 w-full min-w-0 overflow-x-hidden">
						<main className="bg-white rounded-2xl p-3 sm:p-6 shadow-sm border border-blue-100 flex-1 w-full min-w-0 overflow-x-hidden">
							{children}
						</main>
					</div>
				</div>

				{/* Panel de Herramientas Avanzadas (Derecha) */}
				{toolsSidebar}

				{/* Botón de Alertas - Burbuja flotante */}
				<div className="fixed bottom-6 right-6 z-50">
					{alertsButton}
				</div>
			</div>
		</div>
	);
}
