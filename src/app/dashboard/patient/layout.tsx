import SidebarPatient from '@/components/patient/SidebarPatient';
import PatientHamburgerMenu from '@/components/patient/PatientHamburgerMenu';
import ServerDashboardGuard from '@/components/auth/ServerDashboardGuard';

export default function PatientLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ServerDashboardGuard allowedRoles={['PACIENTE']}>
			<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 w-full overflow-x-hidden">
				{/* Menú Hamburger para móviles */}
				<PatientHamburgerMenu />

			<div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6 pt-16 sm:pt-16 md:pt-6">
				<div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6">
					<SidebarPatient />
					<main className="flex-1 min-w-0 w-full">
						{children}
					</main>
				</div>
			</div>
			</div>
		</ServerDashboardGuard>
	);
}
