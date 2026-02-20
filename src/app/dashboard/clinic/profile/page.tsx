/** @refactored ASHIRA Clinic Dashboard - Profile Page */
'use client';

import ClinicProfileComponent from '@/components/ClinicProfileComponent';
import ClinicProfileView from '@/components/ClinicProfileView';

export default function PerfilPage() {
	return (
		<div className="space-y-6">
			<ClinicProfileComponent />
			<ClinicProfileView />
		</div>
	);
}
