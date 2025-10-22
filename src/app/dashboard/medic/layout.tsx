// app/dashboard/clinic/layout.tsx
import React from 'react';
import MedicSidebar from '../medic/components/MedicSidebar';

export const metadata = {
	title: 'Dashboard — Medico',
};

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen rounded-2xl bg-slate-50">
			<div className="max-w-7xl mx-auto p-4 md:p-6">
				<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
					<MedicSidebar />

					<main className="bg-white rounded-2xl p-6 shadow ">{children}</main>
				</div>
			</div>
		</div>
	);
}
