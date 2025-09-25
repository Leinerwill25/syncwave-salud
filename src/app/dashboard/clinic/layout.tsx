// app/dashboard/clinic/layout.tsx
import React from 'react';
import ClinicSidebar from '@/components/ClinicSidebar';

export const metadata = {
	title: 'Dashboard — Clínica',
};

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-slate-50">
			<div className="max-w-7xl mx-auto p-4 md:p-6">
				<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
					<aside>
						<ClinicSidebar />
					</aside>

					<main className="bg-white rounded-2xl p-6 shadow">{children}</main>
				</div>
			</div>
		</div>
	);
}
