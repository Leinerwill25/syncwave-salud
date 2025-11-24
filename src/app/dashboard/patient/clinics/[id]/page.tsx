'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, MapPin, Phone, Mail, Globe, Calendar, Clock, Stethoscope, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type ClinicDetail = {
	id: string;
	legal_name: string;
	trade_name: string | null;
	address_operational: string | null;
	phone_mobile: string | null;
	phone_fixed: string | null;
	contact_email: string | null;
	specialties: any[];
	opening_hours: any[];
	website: string | null;
	social_facebook: string | null;
	social_instagram: string | null;
	doctors: Array<{
		id: string;
		name: string | null;
		email: string | null;
		medic_profile: {
			specialty: string | null;
			private_specialty: string | null;
			photo_url: string | null;
		} | null;
	}>;
	organization: {
		id: string;
		name: string;
		type: string;
	} | null;
};

export default function ClinicDetailPage() {
	const params = useParams();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [clinic, setClinic] = useState<ClinicDetail | null>(null);

	useEffect(() => {
		if (params.id) {
			loadClinic();
		}
	}, [params.id]);

	const loadClinic = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/patient/clinics/${params.id}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404) {
					router.push('/dashboard/patient/clinics');
					return;
				}
				throw new Error('Error al cargar clínica');
			}

			const data = await res.json();
			setClinic(data);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse space-y-3 sm:space-y-4 md:space-y-6">
						<div className="h-6 sm:h-7 md:h-8 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
						<div className="h-48 sm:h-56 md:h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!clinic) {
		return null;
	}

	const specialties = Array.isArray(clinic.specialties)
		? clinic.specialties
		: typeof clinic.specialties === 'string'
			? JSON.parse(clinic.specialties)
			: [];

	const openingHours = Array.isArray(clinic.opening_hours)
		? clinic.opening_hours
		: typeof clinic.opening_hours === 'string'
			? JSON.parse(clinic.opening_hours)
			: [];

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<Link
					href="/dashboard/patient/clinics"
					className="inline-flex items-center gap-1.5 sm:gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-xs sm:text-sm md:text-base"
				>
					<ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
					<span>Volver a clínicas</span>
				</Link>

				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8">
					<div className="flex flex-col sm:flex-row items-start sm:items-start justify-between mb-4 sm:mb-5 md:mb-6 gap-4 sm:gap-6">
						<div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
							<div className="p-2 sm:p-3 md:p-4 bg-indigo-100 rounded-lg sm:rounded-xl flex-shrink-0">
								<Building2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-indigo-600" />
							</div>
							<div className="min-w-0 flex-1">
								<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">
									{clinic.trade_name || clinic.legal_name}
								</h1>
								{clinic.legal_name !== clinic.trade_name && (
									<p className="text-gray-600 text-xs sm:text-sm md:text-base truncate">{clinic.legal_name}</p>
								)}
							</div>
						</div>
						<Link
							href={`/dashboard/patient/citas/new?clinic_id=${clinic.id}`}
							className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base"
						>
							<Calendar className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
							<span>Agendar Cita</span>
						</Link>
					</div>

					{/* Información de contacto */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-7 md:mb-8">
						{clinic.address_operational && (
							<div className="flex items-start gap-2 sm:gap-3">
								<MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Dirección</p>
									<p className="text-gray-600 text-xs sm:text-sm md:text-base break-words">{clinic.address_operational}</p>
								</div>
							</div>
						)}
						{clinic.phone_mobile && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Teléfono Móvil</p>
									<p className="text-gray-600 text-xs sm:text-sm md:text-base break-words">{clinic.phone_mobile}</p>
								</div>
							</div>
						)}
						{clinic.phone_fixed && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Teléfono Fijo</p>
									<p className="text-gray-600 text-xs sm:text-sm md:text-base break-words">{clinic.phone_fixed}</p>
								</div>
							</div>
						)}
						{clinic.contact_email && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Email</p>
									<a href={`mailto:${clinic.contact_email}`} className="text-indigo-600 hover:underline text-xs sm:text-sm md:text-base break-all">
										{clinic.contact_email}
									</a>
								</div>
							</div>
						)}
						{clinic.website && (
							<div className="flex items-start gap-2 sm:gap-3">
								<Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">Sitio Web</p>
									<a
										href={clinic.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-indigo-600 hover:underline text-xs sm:text-sm md:text-base break-all"
									>
										{clinic.website}
									</a>
								</div>
							</div>
						)}
					</div>

					{/* Especialidades */}
					{specialties.length > 0 && (
						<div className="mb-6 sm:mb-7 md:mb-8">
							<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
								<Stethoscope className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-indigo-600 flex-shrink-0" />
								<span>Especialidades</span>
							</h2>
							<div className="flex flex-wrap gap-1.5 sm:gap-2">
								{specialties.map((spec: any, idx: number) => {
									const specName = typeof spec === 'string' ? spec : spec?.name || spec?.specialty || '';
									return (
										<span
											key={idx}
											className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium text-xs sm:text-sm"
										>
											{specName}
										</span>
									);
								})}
							</div>
						</div>
					)}

					{/* Horarios */}
					{openingHours.length > 0 && (
						<div className="mb-6 sm:mb-7 md:mb-8">
							<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
								<Clock className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-indigo-600 flex-shrink-0" />
								<span>Horarios de Atención</span>
							</h2>
							<div className="bg-gray-50 rounded-lg p-3 sm:p-4">
								{openingHours.map((hour: any, idx: number) => (
									<div key={idx} className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-200 last:border-0">
										<span className="font-medium text-gray-900 text-xs sm:text-sm md:text-base">
											{hour.day || hour.dayOfWeek || 'Día'}
										</span>
										<span className="text-gray-600 text-xs sm:text-sm md:text-base">
											{hour.open || hour.start} - {hour.close || hour.end}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Mapa placeholder */}
					<div className="mb-6 sm:mb-7 md:mb-8">
						<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Ubicación</h2>
						<div className="bg-gray-200 rounded-lg h-48 sm:h-56 md:h-64 flex items-center justify-center p-4">
							<MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 flex-shrink-0" />
							<p className="text-gray-500 ml-2 sm:ml-3 md:ml-4 text-xs sm:text-sm md:text-base">Mapa (placeholder - integrar Google Maps)</p>
						</div>
					</div>

					{/* Médicos */}
					{clinic.doctors && clinic.doctors.length > 0 && (
						<div>
							<h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
								<User className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-indigo-600 flex-shrink-0" />
								<span>Médicos ({clinic.doctors.length})</span>
							</h2>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
								{clinic.doctors.map((doctor) => (
									<div
										key={doctor.id}
										className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-indigo-300 transition-colors"
									>
										<div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
											{doctor.medic_profile?.photo_url ? (
												<img
													src={doctor.medic_profile.photo_url}
													alt={doctor.name || 'Médico'}
													className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
												/>
											) : (
												<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
													<User className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
												</div>
											)}
											<div className="min-w-0 flex-1">
												<p className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base truncate">{doctor.name || 'Médico'}</p>
												<p className="text-xs sm:text-sm text-gray-600 truncate">
													{doctor.medic_profile?.specialty ||
														doctor.medic_profile?.private_specialty ||
														'Especialista'}
												</p>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
