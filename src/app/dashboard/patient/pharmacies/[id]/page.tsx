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
			<div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse space-y-6">
						<div className="h-8 bg-gray-200 rounded w-1/3"></div>
						<div className="h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!pharmacy) {
		return null;
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				<Link
					href="/dashboard/patient/pharmacies"
					className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
				>
					<ArrowLeft className="w-4 h-4" />
					Volver a farmacias
				</Link>

				<div className="bg-white rounded-2xl shadow-lg p-8">
					<div className="flex items-start justify-between mb-6">
						<div className="flex items-center gap-4">
							<div className="p-4 bg-green-100 rounded-xl">
								<ShoppingBag className="w-8 h-8 text-green-600" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-900 mb-2">
									{pharmacy.clinic_profile?.trade_name || pharmacy.name}
								</h1>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
						{pharmacy.clinic_profile?.address_operational && (
							<div className="flex items-start gap-3">
								<MapPin className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Dirección</p>
									<p className="text-gray-600">{pharmacy.clinic_profile.address_operational}</p>
								</div>
							</div>
						)}
						{pharmacy.clinic_profile?.phone_mobile && (
							<div className="flex items-start gap-3">
								<Phone className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Teléfono Móvil</p>
									<p className="text-gray-600">{pharmacy.clinic_profile.phone_mobile}</p>
								</div>
							</div>
						)}
						{pharmacy.clinic_profile?.phone_fixed && (
							<div className="flex items-start gap-3">
								<Phone className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Teléfono Fijo</p>
									<p className="text-gray-600">{pharmacy.clinic_profile.phone_fixed}</p>
								</div>
							</div>
						)}
						{pharmacy.clinic_profile?.contact_email && (
							<div className="flex items-start gap-3">
								<Mail className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Email</p>
									<a
										href={`mailto:${pharmacy.clinic_profile.contact_email}`}
										className="text-green-600 hover:underline"
									>
										{pharmacy.clinic_profile.contact_email}
									</a>
								</div>
							</div>
						)}
						{pharmacy.clinic_profile?.website && (
							<div className="flex items-start gap-3">
								<Globe className="w-5 h-5 text-gray-400 mt-1" />
								<div>
									<p className="font-semibold text-gray-900 mb-1">Sitio Web</p>
									<a
										href={pharmacy.clinic_profile.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-green-600 hover:underline"
									>
										{pharmacy.clinic_profile.website}
									</a>
								</div>
							</div>
						)}
					</div>

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
