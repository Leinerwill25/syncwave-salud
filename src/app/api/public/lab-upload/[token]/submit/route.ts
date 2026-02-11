import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseStorage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/public/lab-upload/[token]/submit
 * Enviar resultado de laboratorio
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Validar token
    const { data: link, error: linkError } = await supabase
      .from('lab_upload_link')
      .select('id, organization_id')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ 
        error: 'Token inválido' 
      }, { status: 404 });
    }

    const formData = await req.formData();
    
    // Extraer datos del formulario
    const consultationId = formData.get('consultationId') as string | null;
    const patientId = formData.get('patientId') as string | null;
    const isRegistered = formData.get('isRegistered') === 'true';
    const patientIdNumber = formData.get('patientIdNumber') as string;
    const patientFirstName = formData.get('patientFirstName') as string;
    const patientLastName = formData.get('patientLastName') as string;
    const patientEmail = formData.get('patientEmail') as string | null;
    const patientPhone = formData.get('patientPhone') as string | null;
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const resultType = formData.get('resultType') as string;
    const additionalDetails = formData.get('additionalDetails') as string | null;
    const isCritical = formData.get('isCritical') === 'true';
    
    const specialistName = formData.get('specialistName') as string;
    const specialistIdNumber = formData.get('specialistIdNumber') as string;
    const specialistLabName = formData.get('specialistLabName') as string;
    const specialistEmail = formData.get('specialistEmail') as string | null;
    const specialistPhone = formData.get('specialistPhone') as string | null;

    // Validar campos requeridos
    if (!patientIdNumber || !title || !specialistName || !specialistIdNumber || !specialistLabName) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos' 
      }, { status: 400 });
    }

    // Obtener doctor_id de la consulta si existe
    let doctorId = null;
    if (consultationId) {
      const { data: consultation } = await supabase
        .from('consultation')
        .select('doctor_id')
        .eq('id', consultationId)
        .single();
      
      doctorId = consultation?.doctor_id;
    }

    // Procesar archivos
    const files = formData.getAll('files') as File[];
    const attachments: any[] = [];

    for (const file of files) {
      if (file && file.size > 0) {
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${link.organization_id}/lab-results/${fileName}`;

        // Subir archivo a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseStorage.storage
          .from('lab-results')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        // Obtener URL pública
        const { data: { publicUrl } } = supabaseStorage.storage
          .from('lab-results')
          .getPublicUrl(filePath);

        attachments.push({
          name: file.name,
          url: publicUrl,
          path: filePath,
          size: file.size,
          type: file.type
        });
      }
    }

    // Crear registro de resultado
    const { data: result, error: createError } = await supabase
      .from('lab_result_upload')
      .insert({
        consultation_id: consultationId,
        patient_id: isRegistered ? patientId : null,
        doctor_id: doctorId,
        organization_id: link.organization_id,
        upload_link_id: link.id,
        
        title,
        description,
        result_type: resultType,
        additional_details: additionalDetails,
        attachments: JSON.stringify(attachments),
        
        specialist_name: specialistName,
        specialist_id_number: specialistIdNumber,
        specialist_lab_name: specialistLabName,
        specialist_email: specialistEmail,
        specialist_phone: specialistPhone,
        
        patient_first_name: patientFirstName,
        patient_last_name: patientLastName,
        patient_id_number: patientIdNumber,
        patient_email: patientEmail,
        patient_phone: patientPhone,
        
        status: 'pending',
        is_critical: isCritical,
        viewed_by_patient: false,
        viewed_by_doctor: false
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating result:', createError);
      return NextResponse.json({ 
        error: 'Error al crear resultado' 
      }, { status: 500 });
    }

    // Crear notificaciones (se procesarán después)
    const notifications = [];

    // Notificación para el doctor
    if (doctorId) {
      const { data: doctor } = await supabase
        .from('user')
        .select('email')
        .eq('id', doctorId)
        .single();

      if (doctor?.email) {
        notifications.push({
          lab_result_id: result.id,
          recipient_type: 'doctor',
          recipient_id: doctorId,
          recipient_email: doctor.email,
          notification_type: 'email',
          status: 'pending'
        });

        notifications.push({
          lab_result_id: result.id,
          recipient_type: 'doctor',
          recipient_id: doctorId,
          recipient_email: doctor.email,
          notification_type: 'in_app',
          status: 'pending'
        });
      }
    }

    // Notificación para el paciente
    if (isRegistered && patientId) {
      const { data: patient } = await supabase
        .from('patient')
        .select('id')
        .eq('id', patientId)
        .single();

      // Obtener email del usuario paciente
      const { data: patientUser } = await supabase
        .from('user')
        .select('email')
        .eq('id', patientId)
        .single();

      const email = patientUser?.email || patientEmail;

      if (email) {
        notifications.push({
          lab_result_id: result.id,
          recipient_type: 'patient',
          recipient_id: patientId,
          recipient_email: email,
          notification_type: 'email',
          status: 'pending'
        });

        notifications.push({
          lab_result_id: result.id,
          recipient_type: 'patient',
          recipient_id: patientId,
          recipient_email: email,
          notification_type: 'in_app',
          status: 'pending'
        });
      }
    } else if (patientEmail) {
      // Paciente no registrado con email
      notifications.push({
        lab_result_id: result.id,
        recipient_type: 'patient',
        recipient_id: null,
        recipient_email: patientEmail,
        notification_type: 'email',
        status: 'pending'
      });
    }

    // Insertar notificaciones
    if (notifications.length > 0) {
      await supabase
        .from('lab_upload_notification')
        .insert(notifications);
    }

    // Trigger notification processing (fire and forget)
    try {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send-lab-result-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => console.error('Error triggering notifications:', err));
    } catch (err) {
      console.error('Error triggering notifications:', err);
    }

    return NextResponse.json({
      success: true,
      result: {
        id: result.id,
        title: result.title,
        status: result.status
      },
      message: 'Resultado cargado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting lab result:', error);
    return NextResponse.json({ 
      error: 'Error al enviar resultado' 
    }, { status: 500 });
  }
}
