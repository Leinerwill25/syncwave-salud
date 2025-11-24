'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingBag, MapPin, Phone, Mail, Globe, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type PharmacyDetail = {
	id: string;
	name: string;
	type: string;
	clinic_profile: {
		id: string;
		trade_name: string | null;
		address_operational: string | null;
		phone_mobile: string | null;
		phone_fixed: string | null;
		contact_email: string | null;
		website: string | null;
	} | null;
};

export default function PharmacyDetailPage() {
	const params = useParams();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [pharmacy, setPharmacy] = useState<PharmacyDetail | null>(null);

	useEffect(() => {
		if (params.id) {
			loadPharmacy();
		}
	}, [params.id]);

	const loadPharmacy = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/patient/pharmacies/${params.id}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404) {
					router.push('/dashboard/patient/pharmacies');
					return;
				}
				throw new Error('Error al cargar farmacia');
			}

			const data = await res.json();
			setPharmacy(data);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-3 sm:p-4 md:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse space-y-3 sm:space-y-4 md:space-y-6">
						<div className="h-6 sm:h-7 md:h-8 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
						<div className="h-48 sm:h-56 md:h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!pharmacy) {
		return null;
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				<Link
					href="/dashboard/patient/pharmacies"
					className="inline-flex items-center gap-1.5 sm:gap-2 text-green-600 hover:text-green-700 font-medium text-xs sm:text-sm md:text-base"
				>
					<ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
					<span>Volver a farmacias</span>
				</Link>

				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8">
					<div className="flex items-start justify-between mb-4 sm:mb-5 md:mb-6 gap-4">
						<div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
							<div className="p-2 sm:p-3 md:p-4 bg-green-100 rounded-lg sm:rounded-xl flex-shrink-0">
								<ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-green-600" />
							</div>
							<div className="min-w-0 flex-1">
								<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">
									{pharmacy.clinic_profile?.trade_name || pharmacy.name}
								</h1>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-7 md:mb-8">
						{pharmacy.clinic_profile?.address_operational && (
							<div className="flex items-start gap-2 sm:gap-3">
								<MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Dirección</p>
									<p className="text-gray-600 text-xs sm:text-sm md:text-base break-words">{pharmacy.clinic_profile.address_operational}</p>
								</div>
							</div>
						)}
						{pharmacy.clinic_profile?.phone_mobile && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Teléfono Móvil</p>
									<p className="text-gray-600 text-xs sm:text-sm md:text-base break-words">{pharmacy.clinic_profile.phone_mobile}</p>
								</div>
							</div>
						)}
						{pharmacy.clinic_profile?.phone_fixed && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Teléfono Fijo</p>
									<p className="text-gray-600 text-xs sm:text-sm md:text-base break-words">{pharmacy.clinic_profile.phone_fixed}</p>
								</div>
							</div>
						)}
						{pharmacy.clinic_profile?.contact_email && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Email</p>
									<a
										href={`mailto:${pharmacy.clinic_profile.contact_email}`}
										className="text-green-600 hover:underline text-xs sm:text-sm md:text-base break-all"
									>
										{pharmacy.clinic_profile.contact_email}
									</a>
								</div>
							</div>
						)}
						{pharmacy.clinic_profile?.website && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Sitio Web</p>
									<a
										href={pharmacy.clinic_profile.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-green-600 hover:underline text-xs sm:text-sm md:text-base break-all"
									>
										{pharmacy.clinic_profile.website}
									</a>
								</div>
							</div>
						)}
					</div>

					<div className="mb-6 sm:mb-7 md:mb-8">
						<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Ubicación</h2>
						<div className="bg-gray-200 rounded-lg h-48 sm:h-56 md:h-64 flex items-center justify-center p-4">
							<MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 flex-shrink-0" />
							<p className="text-gray-500 ml-2 sm:ml-3 md:ml-4 text-xs sm:text-sm md:text-base">Mapa (placeholder - integrar Google Maps)</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
