// app/api/patient/family/member/[id]/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const { id } = await params;
		const memberPatientId = id;

		// Verificar que el paciente pertenece al mismo grupo familiar
		const { data: patientGroup } = await supabase
			.from('familygroup')
			.select('id')
			.eq('ownerId', patient.patientId)
			.maybeSingle();

		let groupId: string | null = null;
		if (patientGroup) {
			groupId = patientGroup.id;
		} else {
			const { data: membership } = await supabase
				.from('familygroupmember')
				.select('familyGroupId')
				.eq('patientId', patient.patientId)
				.maybeSingle();
			if (membership) {
				groupId = membership.familyGroupId;
			}
		}

		if (!groupId) {
			return NextResponse.json({ error: 'No perteneces a un grupo familiar' }, { status: 403 });
		}

		// Verificar que el miembro pertenece al mismo grupo
		if (memberPatientId !== patient.patientId) {
			const { data: memberGroup } = await supabase
				.from('familygroupmember')
				.select('familyGroupId')
				.eq('patientId', memberPatientId)
				.maybeSingle();

			if (!memberGroup || memberGroup.familyGroupId !== groupId) {
				return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
			}
		}

		// Obtener datos del paciente
		const { data: memberPatient } = await supabase
			.from('patient')
			.select('*')
			.eq('id', memberPatientId)
			.maybeSingle();

		if (!memberPatient) {
			return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
		}

		// Obtener todos los datos médicos
		const [consultationsRes, prescriptionsRes, labResultsRes, appointmentsRes, facturasRes, tasksRes] = await Promise.all([
			supabase
				.from('consultation')
				.select(`
					id,
					started_at,
					ended_at,
					chief_complaint,
					diagnosis,
					notes,
					vitals,
					doctor:doctor_id (
						id,
						name
					)
				`)
				.eq('patient_id', memberPatientId)
				.order('created_at', { ascending: false }),
			supabase
				.from('prescription')
				.select(`
					id,
					issued_at,
					status,
					notes,
					prescription_item (
						id,
						name,
						dosage,
						frequency,
						instructions
					)
				`)
				.eq('patient_id', memberPatientId)
				.order('created_at', { ascending: false }),
			supabase
				.from('lab_result')
				.select('id, result_type, result, is_critical, reported_at')
				.eq('patient_id', memberPatientId)
				.order('reported_at', { ascending: false }),
			supabase
				.from('appointment')
				.select('id, scheduled_at, status, reason')
				.eq('patient_id', memberPatientId)
				.order('scheduled_at', { ascending: false }),
			supabase
				.from('facturacion')
				.select('id, numero_factura, total, currency, estado_pago, fecha_emision')
				.eq('patient_id', memberPatientId)
				.order('fecha_emision', { ascending: false }),
			supabase
				.from('task')
				.select('id, title, description, due_at, completed, created_at')
				.eq('patient_id', memberPatientId)
				.order('created_at', { ascending: false }),
		]);

		return NextResponse.json({
			patient: memberPatient,
			consultations: consultationsRes.data || [],
			prescriptions: prescriptionsRes.data || [],
			labResults: labResultsRes.data || [],
			appointments: appointmentsRes.data || [],
			facturas: facturasRes.data || [],
			tasks: tasksRes.data || [],
		});
	} catch (err: any) {
		console.error('[Family Member API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

