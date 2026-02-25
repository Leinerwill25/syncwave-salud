import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
	{ auth: { persistSession: false } }
);

export async function PATCH(
	request: Request,
	context: { params: Promise<{ id: string }> }
) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { id } = await context.params;
		const body = await request.json();
		const { firstName, lastName, identifier, phone, isUnregistered } = body;

		const supabase = await createSupabaseServerClient();

		if (isUnregistered) {
			// 1. Validar que el paciente no registrado pertenece o está vinculado a la organización
			// Podríamos verificar si hay citas de este paciente en esta organización
			const { data: appointment } = await supabase
				.from('appointment')
				.select('id')
				.eq('unregistered_patient_id', id)
				.eq('organization_id', session.organizationId)
				.limit(1)
				.maybeSingle();

			if (!appointment) {
				return NextResponse.json({ error: 'No autorizado para editar este paciente' }, { status: 403 });
			}

			// 2. Actualizar en unregisteredpatients
			const { error: updateError } = await supabaseAdmin
				.from('unregisteredpatients')
				.update({
					first_name: firstName,
					last_name: lastName,
					identification: identifier,
					phone: phone
				})
				.eq('id', id);

			if (updateError) {
				console.error('[Role User Patient Edit] Error updating unregistered:', updateError);
				return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 });
			}
		} else {
			// 1. Validar que el paciente registrado está vinculado a la organización
			const { data: appointment } = await supabase
				.from('appointment')
				.select('id')
				.eq('patient_id', id)
				.eq('organization_id', session.organizationId)
				.limit(1)
				.maybeSingle();

			if (!appointment) {
				// También podría estar en consultations
				const { data: consultation } = await supabase
					.from('consultation')
					.select('id')
					.eq('patient_id', id)
					.eq('organization_id', session.organizationId)
					.limit(1)
					.maybeSingle();
				
				if (!consultation) {
					return NextResponse.json({ error: 'No autorizado para editar este paciente' }, { status: 403 });
				}
			}

			// 2. Actualizar en patient
			const { error: updateError } = await supabaseAdmin
				.from('patient')
				.update({
					firstName: firstName,
					lastName: lastName,
					identifier: identifier,
					phone: phone
				})
				.eq('id', id);

			if (updateError) {
				console.error('[Role User Patient Edit] Error updating registered:', updateError);
				return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 });
			}
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('[Role User Patient Edit] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}
