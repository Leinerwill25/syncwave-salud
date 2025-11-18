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
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse space-y-6">
						<div className="h-8 bg-gray-200 rounded w-1/3"></div>
						<div className="h-64 bg-gray-200 rounded"></div>
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
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<Link
					href="/dashboard/patient/clinics"
					className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
				>
					<ArrowLeft className="w-4 h-4" />
					Volver a clínicas
				</Link>

				<div className="bg-white rounded-2xl shadow-lg p-8">
					<div className="flex items-start justify-between mb-6">
						<div className="flex items-center gap-4">
							<div className="p-4 bg-indigo-100 rounded-xl">
								<Building2 className="w-8 h-8 text-indigo-600" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-900 mb-2">
									{clinic.trade_name || clinic.legal_name}
								</h1>
								{clinic.legal_name !== clinic.trade_name && (
									<p className="text-gray-600">{clinic.legal_name}</p>
								)}
							</div>
						</div>
						<Link
							href={`/dashboard/patient/citas/new?clinic_id=${clinic.id}`}
							className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
						>
							<Calendar className="w-5 h-5" />
							Agendar Cita
						</Link>
					</div>

					{/* Información de contacto */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
						{clinic.address_operational && (
							<div className="flex items-start gap-3">
								<MapPin className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Dirección</p>
									<p className="text-gray-600">{clinic.address_operational}</p>
								</div>
							</div>
						)}
						{clinic.phone_mobile && (
							<div className="flex items-start gap-3">
								<Phone className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Teléfono Móvil</p>
									<p className="text-gray-600">{clinic.phone_mobile}</p>
								</div>
							</div>
						)}
						{clinic.phone_fixed && (
							<div className="flex items-start gap-3">
								<Phone className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Teléfono Fijo</p>
									<p className="text-gray-600">{clinic.phone_fixed}</p>
								</div>
							</div>
						)}
						{clinic.contact_email && (
							<div className="flex items-start gap-3">
								<Mail className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Email</p>
									<a href={`mailto:${clinic.contact_email}`} className="text-indigo-600 hover:underline">
										{clinic.contact_email}
									</a>
								</div>
							</div>
						)}
						{clinic.website && (
							<div className="flex items-start gap-3">
								<Globe className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Sitio Web</p>
									<a
										href={clinic.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-indigo-600 hover:underline"
									>
										{clinic.website}
									</a>
								</div>
							</div>
						)}
					</div>

					{/* Especialidades */}
					{specialties.length > 0 && (
						<div className="mb-8">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Stethoscope className="w-5 h-5 text-indigo-600" />
								Especialidades
							</h2>
							<div className="flex flex-wrap gap-2">
								{specialties.map((spec: any, idx: number) => {
									const specName = typeof spec === 'string' ? spec : spec?.name || spec?.specialty || '';
									return (
										<span
											key={idx}
											className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium"
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
						<div className="mb-8">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Clock className="w-5 h-5 text-indigo-600" />
								Horarios de Atención
							</h2>
							<div className="bg-gray-50 rounded-lg p-4">
								{openingHours.map((hour: any, idx: number) => (
									<div key={idx} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
										<span className="font-medium text-gray-900">
											{hour.day || hour.dayOfWeek || 'Día'}
										</span>
										<span className="text-gray-600">
											{hour.open || hour.start} - {hour.close || hour.end}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Mapa placeholder */}
					<div className="mb-8">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Ubicación</h2>
						<div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
							<MapPin className="w-12 h-12 text-gray-400" />
							<p className="text-gray-500 ml-4">Mapa (placeholder - integrar Google Maps)</p>
						</div>
					</div>

					{/* Médicos */}
					{clinic.doctors && clinic.doctors.length > 0 && (
						<div>
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<User className="w-5 h-5 text-indigo-600" />
								Médicos ({clinic.doctors.length})
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{clinic.doctors.map((doctor) => (
									<div
										key={doctor.id}
										className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-indigo-300 transition-colors"
									>
										<div className="flex items-center gap-3 mb-2">
											{doctor.medic_profile?.photo_url ? (
												<img
													src={doctor.medic_profile.photo_url}
													alt={doctor.name || 'Médico'}
													className="w-12 h-12 rounded-full object-cover"
												/>
											) : (
												<div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
													<User className="w-6 h-6 text-indigo-600" />
												</div>
											)}
											<div>
												<p className="font-semibold text-gray-900">{doctor.name || 'Médico'}</p>
												<p className="text-sm text-gray-600">
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
