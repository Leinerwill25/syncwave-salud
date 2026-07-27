// app/dashboard/pharmacy/layout.tsx
import React from 'react';
import PharmacySidebar from '@/components/pharmacy/PharmacySidebar';
import ServerDashboardGuard from '@/components/auth/ServerDashboardGuard';
import AshDashboard from '@/components/AshDashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
	title: 'Dashboard Farmacia — ASHIRA',
};

export default function PharmacyLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ServerDashboardGuard allowedRoles={['FARMACIA']}>
			<div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 w-full max-w-full overflow-x-hidden">
				<div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6 pt-20 sm:pt-20 md:pt-6">
					<div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 items-start">
						<PharmacySidebar />
						<main className="flex-1 min-w-0 w-full">
							{children}
						</main>
					</div>
				</div>
				<AshDashboard />
			</div>
		</ServerDashboardGuard>
	);
}
