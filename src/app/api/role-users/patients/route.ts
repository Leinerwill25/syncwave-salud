import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';
import { createClient } from '@supabase/supabase-js';

// GET: Obtener lista de pacientes registrados y no registrados asociados a la organización
export async function GET(request: NextRequest) {
	try {
		// Verificar sesión del usuario de rol
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado. Debe iniciar sesión como usuario de rol.' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const search = searchParams.get('search')?.toLowerCase() || '';
		const page = parseInt(searchParams.get('page') || '1');
		const pageSize = parseInt(searchParams.get('pageSize') || '20');
		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;

		// Usar service role para evitar problemas de RLS al acceder a datos de pacientes
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Role Users Patients] Variables de entorno de Supabase no configuradas');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		// 1. Obtener pacientes REGISTRADOS vinculados a la organización
		let registeredQuery = supabase
			.from('users')
			.select('patient:patientProfileId(id, firstName, lastName, identifier, phone)')
			.eq('organizationId', session.organizationId)
			.eq('role', 'PACIENTE')
			.not('patientProfileId', 'is', null);

		if (search) {
			// Nota: El filtrado por búsqueda en campos de 'patient' via join en 'users' puede ser complejo.
			// Para máxima eficiencia en Supabase, a veces es mejor buscar en 'patient' directamente si tenemos los IDs 
			// o usar una vista. Por ahora buscaremos en la tabla de pacientes primero si hay búsqueda.
		}

		const { data: directPatients, error: directError } = await registeredQuery;
		
		let registeredPatientsArr: any[] = [];
		if (!directError && directPatients) {
			registeredPatientsArr = directPatients
				.map((u: any) => u.patient)
				.filter(p => !!p);
		}

		// 2. Obtener pacientes NO REGISTRADOS
		// Estos suelen estar vinculados vía citas o creados por médicos de la clínica
		let unregisteredQuery = supabase
			.from('unregisteredpatients')
			.select('id, first_name, last_name, identification, phone, created_by');
			
		// Filtrar por los que tienen citas en la organización
		const { data: orgAppts } = await supabase
			.from('appointment')
			.select('unregistered_patient_id')
			.eq('organization_id', session.organizationId)
			.not('unregistered_patient_id', 'is', null);
		
		const unregIds = Array.from(new Set(orgAppts?.map(a => a.unregistered_patient_id) || []));
		unregisteredQuery = unregisteredQuery.in('id', unregIds);

		if (search) {
			unregisteredQuery = unregisteredQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,identification.ilike.%${search}%`);
		}

		const { data: unregisteredPatientsArr } = await unregisteredQuery;

		// 3. Combinar y filtrar por búsqueda si es necesario (para registrados)
		let combinedPatients = [
			...registeredPatientsArr.map(p => ({
				id: p.id,
				firstName: p.firstName,
				lastName: p.lastName,
				identifier: p.identifier,
				phone: p.phone,
				isUnregistered: false
			})),
			...(unregisteredPatientsArr || []).map(p => ({
				id: p.id,
				firstName: p.first_name,
				lastName: p.last_name,
				identifier: p.identification,
				phone: p.phone,
				isUnregistered: true,
				createdBy: p.created_by
			}))
		];

		if (search) {
			combinedPatients = combinedPatients.filter(p => 
				p.firstName?.toLowerCase().includes(search) || 
				p.lastName?.toLowerCase().includes(search) || 
				p.identifier?.toLowerCase().includes(search) || 
				p.phone?.toLowerCase().includes(search)
			);
		}

		// 4. Paginación en memoria del resultado combinado (ya que viene de 2 fuentes)
		const paginatedPatients = combinedPatients.slice(from, to + 1);

		// 5. Enriquecer solo los de la página actual con citas y consultas
		const enrichedPatients = await Promise.all(paginatedPatients.map(async (p) => {
			const idField = p.isUnregistered ? 'unregistered_patient_id' : 'patient_id';
			
			const [aptsRes, consRes] = await Promise.all([
				supabase.from('appointment')
					.select('id, scheduled_at, status, reason, location')
					.eq('organization_id', session.organizationId)
					.eq(idField, p.id)
					.order('scheduled_at', { ascending: false }),
				supabase.from('consultation')
					.select('started_at')
					.eq('organization_id', session.organizationId)
					.eq(idField, p.id)
			]);

			return {
				patient: p,
				scheduledAppointments: aptsRes.data || [],
				attendedCount: consRes.data?.length || 0,
				consultationDates: consRes.data?.map((c: any) => c.started_at).sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime()) || []
			};
		}));

		return NextResponse.json({ 
			patients: enrichedPatients,
			total: combinedPatients.length,
			page,
			pageSize
		});
	} catch (err) {
		console.error('[Role Users Patients] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}

