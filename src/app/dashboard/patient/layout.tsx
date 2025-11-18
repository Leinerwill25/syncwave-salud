import SidebarPatient from '@/components/patient/SidebarPatient';

export default function PatientLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
			<div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex gap-6">
					<SidebarPatient />
					<main className="flex-1 min-w-0">
						{children}
					</main>
				</div>
			</div>
		</div>
	);
}
