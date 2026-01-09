import { Metadata } from 'next';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import ConsultorioPublicPage from '@/components/consultorio/ConsultorioPublicPage';
import { parseSpecialties, parseOpeningHours } from '@/lib/safe-json-parse';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
	const { id } = await params;
	const cookieStore = await cookies();
	const supabase = await createSupabaseServerClient();

	try {
		// Obtener datos del consultorio
		const { data: organization } = await supabase
			.from('organization')
			.select(`
				id,
				name,
				type,
				clinic_profile:clinic_profile!clinic_profile_org_fk (
					trade_name,
					legal_name,
					profile_photo,
					specialties,
					social_instagram,
					social_facebook
				)
			`)
			.eq('id', id)
			.eq('type', 'CONSULTORIO')
			.maybeSingle();

		if (!organization) {
			return {
				title: 'Consultorio no encontrado',
			};
		}

		const clinicProfile = Array.isArray(organization.clinic_profile)
			? organization.clinic_profile[0]
			: organization.clinic_profile;

		const displayName = clinicProfile?.trade_name || clinicProfile?.legal_name || organization.name;
		const specialties = parseSpecialties(clinicProfile?.specialties);
		const specialtyText = specialties.length > 0 ? specialties[0] : 'Consultorio Médico';

		return {
			title: `${displayName} - ${specialtyText}`,
			description: `Consultorio privado especializado en ${specialtyText}. Agenda tu cita y conoce nuestros servicios médicos.`,
			openGraph: {
				title: `${displayName} - ${specialtyText}`,
				description: `Consultorio privado especializado en ${specialtyText}. Agenda tu cita y conoce nuestros servicios médicos.`,
				type: 'website',
				images: clinicProfile?.profile_photo ? [clinicProfile.profile_photo] : [],
			},
			twitter: {
				card: 'summary_large_image',
				title: `${displayName} - ${specialtyText}`,
				description: `Consultorio privado especializado en ${specialtyText}. Agenda tu cita y conoce nuestros servicios médicos.`,
				images: clinicProfile?.profile_photo ? [clinicProfile.profile_photo] : [],
			},
		};
	} catch (error) {
		return {
			title: 'Consultorio Médico',
		};
	}
}

export default async function ConsultorioPublicRoute({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const cookieStore = await cookies();
	const supabase = await createSupabaseServerClient();

	try {
		// Obtener datos del consultorio
		const { data: organization, error: orgError } = await supabase
			.from('organization')
			.select(`
				id,
				name,
				type,
				address,
				phone,
				contactEmail,
				clinic_profile:clinic_profile!clinic_profile_org_fk (
					id,
					organization_id,
					legal_name,
					trade_name,
					address_operational,
					phone_mobile,
					phone_fixed,
					contact_email,
					website,
					social_facebook,
					social_instagram,
					social_linkedin,
					specialties,
					opening_hours,
					location,
					photos,
					profile_photo,
					sanitary_license,
					liability_insurance_number,
					has_cashea
				)
			`)
			.eq('id', id)
			.eq('type', 'CONSULTORIO')
			.maybeSingle();

		if (orgError || !organization) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
					<div className="text-center">
						<h1 className="text-3xl font-bold text-slate-900 mb-2">Consultorio no encontrado</h1>
						<p className="text-slate-600">El consultorio que buscas no existe o no está disponible.</p>
					</div>
				</div>
			);
		}

		// Obtener médicos del consultorio
		const { data: doctors } = await supabase
			.from('user')
			.select(`
				id,
				name,
				email,
				medic_profile:medic_profile!fk_medic_profile_doctor (
					id,
					specialty,
					private_specialty,
					photo_url,
					credentials,
					services,
					service_combos,
					availability,
					has_cashea
				)
			`)
			.eq('organizationId', organization.id)
			.eq('role', 'MEDICO');

		// Normalizar clinic_profile
		const clinicProfile = Array.isArray(organization.clinic_profile)
			? organization.clinic_profile[0]
			: organization.clinic_profile || {};

		// Parsear campos JSON
		const specialties = parseSpecialties(clinicProfile.specialties);
		const openingHours = parseOpeningHours(clinicProfile.opening_hours);

		// Parsear location
		let location = null;
		if (clinicProfile.location) {
			try {
				location = typeof clinicProfile.location === 'string'
					? JSON.parse(clinicProfile.location)
					: clinicProfile.location;
			} catch {
				location = null;
			}
		}

		// Parsear photos
		let photos: string[] = [];
		if (clinicProfile.photos) {
			try {
				const parsed = Array.isArray(clinicProfile.photos)
					? clinicProfile.photos
					: typeof clinicProfile.photos === 'string'
						? JSON.parse(clinicProfile.photos)
						: [];
				photos = Array.isArray(parsed)
					? parsed.filter((url: any) => url && typeof url === 'string')
					: [];
			} catch {
				photos = [];
			}
		}

		// Parsear información de médicos
		const doctorsWithParsedData = (doctors || []).map((doctor: any) => {
			const profile = doctor.medic_profile;
			if (!profile) return doctor;

			let services: any[] = [];
			let serviceCombos: any[] = [];
			let credentials: any = {};
			let availability: any = {};

			try {
				services = profile.services
					? (Array.isArray(profile.services)
						? profile.services
						: typeof profile.services === 'string'
							? JSON.parse(profile.services)
							: [])
					: [];
			} catch {
				services = [];
			}

			try {
				serviceCombos = profile.service_combos
					? (Array.isArray(profile.service_combos)
						? profile.service_combos
						: typeof profile.service_combos === 'string'
							? JSON.parse(profile.service_combos)
							: [])
					: [];
			} catch {
				serviceCombos = [];
			}

			try {
				credentials = profile.credentials
					? (typeof profile.credentials === 'string' ? JSON.parse(profile.credentials) : profile.credentials)
					: {};
			} catch {
				credentials = {};
			}

			try {
				availability = profile.availability
					? (typeof profile.availability === 'string' ? JSON.parse(profile.availability) : profile.availability)
					: {};
			} catch {
				availability = {};
			}

			return {
				...doctor,
				medic_profile: {
					...profile,
					services,
					serviceCombos,
					credentials,
					availability,
				},
			};
		});

		const consultorioData = {
			id: organization.id,
			name: organization.name,
			legal_name: clinicProfile.legal_name || organization.name,
			trade_name: clinicProfile.trade_name || clinicProfile.legal_name || organization.name,
			address_operational: clinicProfile.address_operational || organization.address,
			phone_mobile: clinicProfile.phone_mobile || organization.phone,
			phone_fixed: clinicProfile.phone_fixed,
			contact_email: clinicProfile.contact_email || organization.contactEmail,
			website: clinicProfile.website,
			social_facebook: clinicProfile.social_facebook,
			social_instagram: clinicProfile.social_instagram,
			social_linkedin: clinicProfile.social_linkedin,
			specialties,
			opening_hours: openingHours,
			location,
			photos,
			profile_photo: clinicProfile.profile_photo,
			sanitary_license: clinicProfile.sanitary_license,
			liability_insurance_number: clinicProfile.liability_insurance_number,
			has_cashea: clinicProfile.has_cashea || false,
			doctors: doctorsWithParsedData,
		};

		return <ConsultorioPublicPage consultorio={consultorioData} />;
	} catch (error) {
		console.error('Error loading consultorio:', error);
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-slate-900 mb-2">Error al cargar consultorio</h1>
					<p className="text-slate-600">Ocurrió un error al cargar la información del consultorio.</p>
				</div>
			</div>
		);
	}
}

