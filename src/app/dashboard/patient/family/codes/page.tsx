'use client';

import { Clock } from 'lucide-react';

export default function FamilyCodesPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 md:p-16">
					<div className="text-center">
						<div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full mb-6">
							<Clock className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
						</div>
						<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
							Próximamente
						</h1>
						<p className="text-base sm:text-lg md:text-xl text-gray-600">
							Esta funcionalidad estará disponible pronto.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
