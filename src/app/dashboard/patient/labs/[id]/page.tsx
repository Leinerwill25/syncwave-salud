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
			<div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse space-y-6">
						<div className="h-8 bg-gray-200 rounded w-1/3"></div>
						<div className="h-64 bg-gray-200 rounded"></div>
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
		<div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				<Link
					href="/dashboard/patient/labs"
					className="inline-flex items-center gap-2 text-yellow-600 hover:text-yellow-700 font-medium"
				>
					<ArrowLeft className="w-4 h-4" />
					Volver a laboratorios
				</Link>

				<div className="bg-white rounded-2xl shadow-lg p-8">
					<div className="flex items-start justify-between mb-6">
						<div className="flex items-center gap-4">
							<div className="p-4 bg-yellow-100 rounded-xl">
								<FlaskConical className="w-8 h-8 text-yellow-600" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-900 mb-2">
									{lab.clinic_profile?.trade_name || lab.name}
								</h1>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
						{lab.clinic_profile?.address_operational && (
							<div className="flex items-start gap-3">
								<MapPin className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Dirección</p>
									<p className="text-gray-600">{lab.clinic_profile.address_operational}</p>
								</div>
							</div>
						)}
						{lab.clinic_profile?.phone_mobile && (
							<div className="flex items-start gap-3">
								<Phone className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Teléfono Móvil</p>
									<p className="text-gray-600">{lab.clinic_profile.phone_mobile}</p>
								</div>
							</div>
						)}
						{lab.clinic_profile?.phone_fixed && (
							<div className="flex items-start gap-3">
								<Phone className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Teléfono Fijo</p>
									<p className="text-gray-600">{lab.clinic_profile.phone_fixed}</p>
								</div>
							</div>
						)}
						{lab.clinic_profile?.contact_email && (
							<div className="flex items-start gap-3">
								<Mail className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Email</p>
									<a
										href={`mailto:${lab.clinic_profile.contact_email}`}
										className="text-yellow-600 hover:underline"
									>
										{lab.clinic_profile.contact_email}
									</a>
								</div>
							</div>
						)}
						{lab.clinic_profile?.website && (
							<div className="flex items-start gap-3">
								<Globe className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Sitio Web</p>
									<a
										href={lab.clinic_profile.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-yellow-600 hover:underline"
									>
										{lab.clinic_profile.website}
									</a>
								</div>
							</div>
						)}
					</div>

					{specialties.length > 0 && (
						<div className="mb-8">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">Exámenes Disponibles</h2>
							<div className="flex flex-wrap gap-2">
								{specialties.map((spec: any, idx: number) => {
									const specName = typeof spec === 'string' ? spec : spec?.name || spec?.specialty || '';
									return (
										<span
											key={idx}
											className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg font-medium"
										>
											{specName}
										</span>
									);
								})}
							</div>
						</div>
					)}

					<div className="mb-8">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Ubicación</h2>
						<div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
							<MapPin className="w-12 h-12 text-gray-400" />
							<p className="text-gray-500 ml-4">Mapa (placeholder - integrar Google Maps)</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
