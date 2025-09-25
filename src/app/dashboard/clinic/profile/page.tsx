'use client';

import ClinicProfileComponent from '@/components/ClinicProfileComponent';
import ClinicProfileView from '@/components/ClinicProfileView';

export default function PerfilPage() {
	return (
		<main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-10">
			<div className="max-w-5xl mx-auto">
				<ClinicProfileComponent />
				<ClinicProfileView />
			</div>
		</main>
	);
}
