// app/dashboard/medic/layout.tsx
import React from 'react';
import MedicSidebar from '../medic/components/MedicSidebar';
import MedicAdvancedToolsSidebar from '../medic/components/MedicAdvancedToolsSidebar';
import MedicHamburgerMenu from '@/components/medic/MedicHamburgerMenu';
import ServerDashboardGuard from '@/components/auth/ServerDashboardGuard';
import AlertsButton from '@/components/medic/AlertsButton';
import ProfileCompleteGuard from '@/components/medic/ProfileCompleteGuard';
import { LiteModeProvider } from '@/contexts/LiteModeContext';

import MedicDashboardShell from './components/MedicDashboardShell';

// Usar renderizado dinámico solo cuando sea necesario
export const dynamic = 'auto';

export const metadata = {
	title: 'Dashboard — Medico',
};

export default function MedicLayout({ children }: { children: React.ReactNode }) {
	return (
		<ServerDashboardGuard allowedRoles={['MEDICO']}>
			<ProfileCompleteGuard>
				<LiteModeProvider>
					<MedicDashboardShell
						sidebar={<MedicSidebar />}
						toolsSidebar={<MedicAdvancedToolsSidebar />}
						alertsButton={<AlertsButton />}
						hamburgerMenu={<MedicHamburgerMenu />}
					>
						{children}
					</MedicDashboardShell>
				</LiteModeProvider>
			</ProfileCompleteGuard>
		</ServerDashboardGuard>
	);
}
