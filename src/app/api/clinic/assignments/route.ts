import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { sendAssignmentNotification } from '@/lib/resend-service';

export async function GET(request: NextRequest) {
    try {
        const authCheck = await apiRequireRole(['ADMIN']);
        if (authCheck.response) return authCheck.response;

        const supabase = await createSupabaseServerClient();
        const orgId = authCheck.user?.organizationId;

        if (!orgId) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 400 });

        // 1. Obtener Pacientes (Registrados y no registrados)
        const { data: regPatients } = await supabase
            .from('patient')
            .select('id, first_name, last_name, identifier')
            .eq('organization_id', orgId);

        const { data: unregPatients } = await supabase
            .from('unregisteredpatients')
            .select('id, first_name, last_name, identifier')
            .eq('organization_id', orgId);

        // 2. Obtener Médicos de la organización
        const { data: medics } = await supabase
            .from('users')
            .select('id, full_name, role, email')
            .eq('organization_id', orgId)
            .eq('role', 'MEDICO');

        // 3. Obtener Enfermeros
        const { data: nurses } = await supabase
            .from('users')
            .select('id, full_name, role, email')
            .eq('organization_id', orgId)
            .eq('role', 'ENFERMERO');

        // 4. Obtener Asignaciones actuales
        const { data: assignments } = await supabase
            .from('clinic_patient_care_team')
            .select('*')
            .eq('organization_id', orgId)
            .eq('status', 'ACTIVE');

        // 5. Obtener Estados de pacientes
        const { data: statuses } = await supabase
            .from('patient_clinic_status')
            .select('*')
            .eq('organization_id', orgId);

        return NextResponse.json({
            patients: [
                ...(regPatients || []).map(p => ({ ...p, type: 'REG' })),
                ...(unregPatients || []).map(p => ({ ...p, type: 'UNREG' }))
            ],
            professionals: [
                ...(medics || []),
                ...(nurses || [])
            ],
            assignments: assignments || [],
            statuses: statuses || []
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authCheck = await apiRequireRole(['ADMIN']);
        if (authCheck.response) return authCheck.response;

        const supabase = await createSupabaseServerClient();
        const body = await request.json();
        const orgId = authCheck.user?.organizationId;

        const { 
            patientId, 
            isUnregistered, 
            professionalId, 
            professionalRole,
            action, // 'ASSIGN' | 'REMOVE' | 'STATUS_UPDATE'
            overallStatus,
            complexityLevel,
            notes
        } = body;

        if (action === 'STATUS_UPDATE') {
            const { error } = await supabase
                .from('patient_clinic_status')
                .upsert({
                    organization_id: orgId,
                    patient_id: isUnregistered ? null : patientId,
                    unregistered_patient_id: isUnregistered ? patientId : null,
                    overall_status: overallStatus,
                    complexity_level: complexityLevel,
                    notes,
                    last_update_at: new Date().toISOString()
                }, {
                    onConflict: isUnregistered ? 'organization_id, unregistered_patient_id' : 'organization_id, patient_id'
                });
            
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (action === 'REMOVE') {
            const query = supabase
                .from('clinic_patient_care_team')
                .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
                .eq('organization_id', orgId)
                .eq('professional_id', professionalId);
            
            if (isUnregistered) query.eq('unregistered_patient_id', patientId);
            else query.eq('patient_id', patientId);

            const { error } = await query;
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // 1. Crear Asignación
        const { data: assignment, error } = await supabase
            .from('clinic_patient_care_team')
            .upsert({
                organization_id: orgId,
                patient_id: isUnregistered ? null : patientId,
                unregistered_patient_id: isUnregistered ? patientId : null,
                professional_id: professionalId,
                professional_role: professionalRole,
                status: 'ACTIVE',
                assigned_by: authCheck.user?.authId
            }, { 
                onConflict: isUnregistered ? 'organization_id, unregistered_patient_id, professional_id, status' : 'organization_id, patient_id, professional_id, status' 
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Inicializar Estado del Paciente si no existe
        await supabase
            .from('patient_clinic_status')
            .upsert({
                organization_id: orgId,
                patient_id: isUnregistered ? null : patientId,
                unregistered_patient_id: isUnregistered ? patientId : null,
                overall_status: 'ACTIVE',
                last_update_at: new Date().toISOString()
            }, {
                onConflict: isUnregistered ? 'organization_id, unregistered_patient_id' : 'organization_id, patient_id'
            });

        // 3. Notificación por Correo
        const { data: prof } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', professionalId)
            .single();

        const { data: clinic } = await supabase
            .from('organization')
            .select('name')
            .eq('id', orgId)
            .single();

        // Obtener nombre del paciente para el correo
        let patientName = 'Paciente';
        if (isUnregistered) {
            const { data: p } = await supabase.from('unregisteredpatients').select('first_name, last_name').eq('id', patientId).single();
            if (p) patientName = `${p.first_name} ${p.last_name}`;
        } else {
            const { data: p } = await supabase.from('patient').select('first_name, last_name').eq('id', patientId).single();
            if (p) patientName = `${p.first_name} ${p.last_name}`;
        }

        if (prof?.email) {
            await sendAssignmentNotification({
                to: prof.email,
                professionalName: prof.full_name || 'Colega',
                patientName: patientName,
                clinicName: clinic?.name || 'la Clínica',
                role: professionalRole
            });
        }

        return NextResponse.json({ success: true, assignment });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
