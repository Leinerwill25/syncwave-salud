// app/api/patient/explore/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { parseSpecialties } from '@/lib/safe-json-parse';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(request.url);
		const query = url.searchParams.get('query') || '';
		const type = url.searchParams.get('type'); // CLINICA, FARMACIA, LABORATORIO, CONSULTORIO_PRIVADO
		const specialty = url.searchParams.get('specialty');
		const exam = url.searchParams.get('exam');
		const budgetMin = url.searchParams.get('budget_min');
		const budgetMax = url.searchParams.get('budget_max');
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20', 10), 100);
		const offset = (page - 1) * perPage;

		const results: any[] = [];

		// Buscar clínicas
		if (!type || type === 'CLINICA') {
			let clinicQuery = supabase
				.from('clinic_profile')
				.select(`
					id,
					organization_id,
					legal_name,
					trade_name,
					address_operational,
					phone_mobile,
					specialties,
					organization:Organization!clinic_profile_org_fk (
						id,
						name,
						type
					)
				`)
				.range(offset, offset + perPage - 1);

			if (query) {
				clinicQuery = clinicQuery.or(`legal_name.ilike.%${query}%,trade_name.ilike.%${query}%`);
			}

			const { data: clinics } = await clinicQuery;

			if (clinics) {
				clinics.forEach((clinic: any) => {
					const specialties = parseSpecialties(clinic.specialties);

					// Filtrar por especialidad si se proporciona
					if (specialty) {
						const hasSpecialty = specialties.some((s: any) => {
							const specName = typeof s === 'string' ? s : s?.name || s?.specialty || '';
							return specName.toLowerCase().includes(specialty.toLowerCase());
						});
						if (!hasSpecialty) return;
					}

					results.push({
						type: 'CLINICA',
						id: clinic.id,
						name: clinic.trade_name || clinic.legal_name,
						organization: clinic.organization,
						specialties,
						address: clinic.address_operational,
						phone: clinic.phone_mobile,
					});
				});
			}
		}

		// Buscar farmacias
		if (!type || type === 'FARMACIA') {
			let pharmacyQuery = supabase
				.from('Organization')
				.select(`
					id,
					name,
					type,
					clinic_profile:clinic_profile!clinic_profile_org_fk (
						id,
						trade_name,
						address_operational,
						phone_mobile
					)
				`)
				.eq('type', 'FARMACIA')
				.range(offset, offset + perPage - 1);

			if (query) {
				pharmacyQuery = pharmacyQuery.ilike('name', `%${query}%`);
			}

			const { data: pharmacies } = await pharmacyQuery;

			if (pharmacies) {
				pharmacies.forEach((pharmacy: any) => {
					results.push({
						type: 'FARMACIA',
						id: pharmacy.id,
						name: pharmacy.name,
						address: pharmacy.clinic_profile?.address_operational,
						phone: pharmacy.clinic_profile?.phone_mobile,
					});
				});
			}
		}

		// Buscar laboratorios
		if (!type || type === 'LABORATORIO') {
			let labQuery = supabase
				.from('Organization')
				.select(`
					id,
					name,
					type,
					clinic_profile:clinic_profile!clinic_profile_org_fk (
						id,
						trade_name,
						address_operational,
						phone_mobile,
						specialties
					)
				`)
				.eq('type', 'LABORATORIO')
				.range(offset, offset + perPage - 1);

			if (query) {
				labQuery = labQuery.ilike('name', `%${query}%`);
			}

			const { data: labs } = await labQuery;

			if (labs) {
				labs.forEach((lab: any) => {
					const specialties = parseSpecialties(lab.clinic_profile?.specialties);

					// Filtrar por tipo de examen si se proporciona
					if (exam) {
						const hasExam = specialties.some((s: any) => {
							const specName = typeof s === 'string' ? s : s?.name || s?.specialty || '';
							return specName.toLowerCase().includes(exam.toLowerCase());
						});
						if (!hasExam) return;
					}

					results.push({
						type: 'LABORATORIO',
						id: lab.id,
						name: lab.name,
						address: lab.clinic_profile?.address_operational,
						phone: lab.clinic_profile?.phone_mobile,
						specialties,
					});
				});
			}
		}

		// Buscar consultorios privados (médicos sin organizationId)
		if (!type || type === 'CONSULTORIO_PRIVADO') {
			let privateQuery = supabase
				.from('User')
				.select(`
					id,
					name,
					email,
					medic_profile:medic_profile!fk_medic_profile_doctor (
						private_specialty,
						specialty,
						services,
						photo_url
					)
				`)
				.eq('role', 'MEDICO')
				.is('organizationId', null)
				.range(offset, offset + perPage - 1);

			if (query) {
				privateQuery = privateQuery.ilike('name', `%${query}%`);
			}

			const { data: doctors } = await privateQuery;

			if (doctors) {
				doctors.forEach((doctor: any) => {
					const specialty = doctor.medic_profile?.private_specialty || doctor.medic_profile?.specialty;
					
					// Filtrar por especialidad si se proporciona
					if (specialty && specialty.toLowerCase().includes((specialty || '').toLowerCase())) {
						// continue
					} else if (specialty) {
						return;
					}

					results.push({
						type: 'CONSULTORIO_PRIVADO',
						id: doctor.id,
						name: doctor.name,
						email: doctor.email,
						specialty,
						services: doctor.medic_profile?.services || [],
						photo: doctor.medic_profile?.photo_url,
					});
				});
			}
		}

		return NextResponse.json({
			data: results,
			meta: {
				page,
				per_page: perPage,
				total: results.length,
			},
		});
	} catch (err: any) {
		console.error('[Patient Explore API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

