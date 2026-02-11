import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/public/lab-upload/[token]/search-patient
 * Buscar paciente por número de cédula
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const idNumber = searchParams.get('idNumber');

    if (!token || !idNumber) {
      return NextResponse.json({ 
        error: 'Token o número de cédula no proporcionado' 
      }, { status: 400 });
    }

    // Validar token
    const { data: link, error: linkError } = await supabase
      .from('lab_upload_link')
      .select('organization_id')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ 
        error: 'Token inválido' 
      }, { status: 404 });
    }

    // Buscar paciente registrado por cédula
    const { data: patient, error: patientError } = await supabase
      .from('patient')
      .select('id, firstName, lastName, identifier, phone, dob, gender')
      .eq('identifier', idNumber)
      .single();

    if (patient) {
      // Paciente registrado encontrado
      // Buscar consultas del paciente en esta organización
      const { data: consultations, error: consultError } = await supabase
        .from('consultation')
        .select(`
          id,
          started_at,
          chief_complaint,
          diagnosis,
          doctor:doctor_id (
            id,
            name,
            email
          )
        `)
        .eq('patient_id', patient.id)
        .eq('organization_id', link.organization_id)
        .order('started_at', { ascending: false })
        .limit(10);

      return NextResponse.json({
        found: true,
        isRegistered: true,
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          identifier: patient.identifier,
          phone: patient.phone,
          dob: patient.dob,
          gender: patient.gender
        },
        consultations: consultations?.map(c => ({
          id: c.id,
          date: c.started_at,
          reason: c.chief_complaint,
          diagnosis: c.diagnosis,
          doctorName: (c.doctor as any)?.name || 'Doctor'
        })) || []
      }, { status: 200 });
    }

    // Buscar en pacientes no registrados
    const { data: unregisteredPatient, error: unregError } = await supabase
      .from('unregisteredpatients')
      .select('id, first_name, last_name, identification, phone, birth_date, sex')
      .eq('identification', idNumber)
      .single();

    if (unregisteredPatient) {
      // Paciente no registrado encontrado
      // Buscar consultas
      const { data: consultations, error: consultError } = await supabase
        .from('consultation')
        .select(`
          id,
          started_at,
          chief_complaint,
          diagnosis,
          doctor:doctor_id (
            id,
            name,
            email
          )
        `)
        .eq('unregistered_patient_id', unregisteredPatient.id)
        .eq('organization_id', link.organization_id)
        .order('started_at', { ascending: false })
        .limit(10);

      return NextResponse.json({
        found: true,
        isRegistered: false,
        patient: {
          id: unregisteredPatient.id,
          firstName: unregisteredPatient.first_name,
          lastName: unregisteredPatient.last_name,
          identifier: unregisteredPatient.identification,
          phone: unregisteredPatient.phone,
          dob: unregisteredPatient.birth_date,
          gender: unregisteredPatient.sex
        },
        consultations: consultations?.map(c => ({
          id: c.id,
          date: c.started_at,
          reason: c.chief_complaint,
          diagnosis: c.diagnosis,
          doctorName: (c.doctor as any)?.name || 'Doctor'
        })) || []
      }, { status: 200 });
    }

    // No se encontró el paciente
    return NextResponse.json({
      found: false,
      isRegistered: false,
      message: 'Paciente no encontrado en el sistema'
    }, { status: 200 });

  } catch (error) {
    console.error('Error searching patient:', error);
    return NextResponse.json({ 
      error: 'Error al buscar paciente' 
    }, { status: 500 });
  }
}
