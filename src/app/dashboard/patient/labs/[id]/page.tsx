'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FlaskConical, MapPin, Phone, Mail, Globe, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type LabDetail = {
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
		specialties: any[];
	} | null;
};

export default function LabDetailPage() {
	const params = useParams();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [lab, setLab] = useState<LabDetail | null>(null);

	useEffect(() => {
		if (params.id) {
			loadLab();
		}
	}, [params.id]);

	const loadLab = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/patient/labs/${params.id}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404) {
					router.push('/dashboard/patient/labs');
					return;
				}
				throw new Error('Error al cargar laboratorio');
			}

			const data = await res.json();
			setLab(data);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 p-3 sm:p-4 md:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse space-y-3 sm:space-y-4 md:space-y-6">
						<div className="h-6 sm:h-7 md:h-8 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
						<div className="h-48 sm:h-56 md:h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!lab) {
		return null;
	}

	const specialties = Array.isArray(lab.clinic_profile?.specialties)
		? lab.clinic_profile.specialties
		: typeof lab.clinic_profile?.specialties === 'string'
			? JSON.parse(lab.clinic_profile.specialties)
			: [];

	return (
		<div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				<Link
					href="/dashboard/patient/labs"
					className="inline-flex items-center gap-1.5 sm:gap-2 text-yellow-600 hover:text-yellow-700 font-medium text-xs sm:text-sm md:text-base"
				>
					<ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
					<span>Volver a laboratorios</span>
				</Link>

				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8">
					<div className="flex items-start justify-between mb-4 sm:mb-5 md:mb-6 gap-2">
						<div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
							<div className="p-2 sm:p-3 md:p-4 bg-yellow-100 rounded-lg sm:rounded-xl flex-shrink-0">
								<FlaskConical className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-yellow-600" />
							</div>
							<div className="min-w-0 flex-1">
								<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">
									{lab.clinic_profile?.trade_name || lab.name}
								</h1>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-7 md:mb-8">
						{lab.clinic_profile?.address_operational && (
							<div className="flex items-start gap-2 sm:gap-3">
								<MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Dirección</p>
									<p className="text-xs sm:text-sm md:text-base text-gray-600 break-words">{lab.clinic_profile.address_operational}</p>
								</div>
							</div>
						)}
						{lab.clinic_profile?.phone_mobile && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Teléfono Móvil</p>
									<p className="text-xs sm:text-sm md:text-base text-gray-600 break-words">{lab.clinic_profile.phone_mobile}</p>
								</div>
							</div>
						)}
						{lab.clinic_profile?.phone_fixed && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Teléfono Fijo</p>
									<p className="text-xs sm:text-sm md:text-base text-gray-600 break-words">{lab.clinic_profile.phone_fixed}</p>
								</div>
							</div>
						)}
						{lab.clinic_profile?.contact_email && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Email</p>
									<a
										href={`mailto:${lab.clinic_profile.contact_email}`}
										className="text-yellow-600 hover:underline text-xs sm:text-sm md:text-base break-all"
									>
										{lab.clinic_profile.contact_email}
									</a>
								</div>
							</div>
						)}
						{lab.clinic_profile?.website && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Sitio Web</p>
									<a
										href={lab.clinic_profile.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-yellow-600 hover:underline text-xs sm:text-sm md:text-base break-all"
									>
										{lab.clinic_profile.website}
									</a>
								</div>
							</div>
						)}
					</div>

					{specialties.length > 0 && (
						<div className="mb-6 sm:mb-7 md:mb-8">
							<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Exámenes Disponibles</h2>
							<div className="flex flex-wrap gap-1.5 sm:gap-2">
								{specialties.map((spec: any, idx: number) => {
									const specName = typeof spec === 'string' ? spec : spec?.name || spec?.specialty || '';
									return (
										<span
											key={idx}
											className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-yellow-50 text-yellow-700 rounded-lg font-medium text-xs sm:text-sm"
										>
											{specName}
										</span>
									);
								})}
							</div>
						</div>
					)}

					<div className="mb-6 sm:mb-7 md:mb-8">
						<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Ubicación</h2>
						<div className="bg-gray-200 rounded-lg h-48 sm:h-56 md:h-64 flex items-center justify-center p-4">
							<MapPin className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400 flex-shrink-0" />
							<p className="text-gray-500 ml-2 sm:ml-3 md:ml-4 text-xs sm:text-sm md:text-base">Mapa (placeholder - integrar Google Maps)</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
