'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { checkAndAwardStage2 } from './referrals';
import { SafecarePlanType, SafecareZone, SafecareRequest } from '@/types/safecare';
import { revalidatePath } from 'next/cache';
import { sendNotification } from '@/lib/notifications-engine';

/**
 * Crea una nueva solicitud de servicio SafeCare y genera el link de WhatsApp.
 */
export async function createSafecareRequest(
  patientId: string, 
  planType: SafecarePlanType, 
  details: {
    zone: SafecareZone;
    address: string;
    preferredDatetime?: string;
    notes?: string;
    servicesSelected: string[];
    beneficiaryId?: string;
    beneficiaryName?: string;
  }
) {
  try {
    // 0. Obtener datos extendidos del paciente para el mensaje
    const { data: patientDetails } = await supabaseAdmin
      .from('patient')
      .select('phoneNumber, emergencyContactNumber, email')
      .eq('id', patientId)
      .single();

    const phone = patientDetails?.phoneNumber || 'No posee';
    const emergency = patientDetails?.emergencyContactNumber || 'No posee';
    const email = patientDetails?.email || 'No posee';

    // 1. Insertar la solicitud en la base de datos
    const { data: request, error: insertError } = await supabaseAdmin
      .from('safecare_requests')
      .insert({
        patient_id: patientId,
        beneficiary_id: details.beneficiaryId || null,
        plan_type: planType,
        patient_zone: details.zone,
        patient_address: details.address,
        preferred_datetime: details.preferredDatetime,
        patient_notes: details.notes,
        service_details: { 
          services: details.servicesSelected,
          beneficiaryName: details.beneficiaryName || 'Titular',
          contactInfo: { phone, emergency, email }
        },
        status: 'requested'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Generar URL de WhatsApp
    const whatsappNumber = process.env.SAFECARE_WHATSAPP_NUMBER || '584121234567';
    const planLabel = planType === 'atencion_puntual' ? 'Atención Puntual' : 'Revitalización y Bienestar';
    
    const message = encodeURIComponent(
      `Hola SafeCare, soy paciente de ASHIRA.\n\n` +
      `*Plan solicitado:* ${planLabel}\n` +
      `*Para:* ${details.beneficiaryName || 'Mi persona'}\n` +
      `*Servicios:* ${details.servicesSelected.join(', ')}\n` +
      `*Zona:* ${details.zone.replace('_', ' ')}\n` +
      `*Dirección:* ${details.address}\n` +
      `*Fecha preferida:* ${details.preferredDatetime || 'A convenir'}\n` +
      `*Notas:* ${details.notes || 'Ninguna'}\n\n` +
      `*--- DATOS DE CONTACTO ---*\n` +
      `*Teléfono:* ${phone}\n` +
      `*Emergencia:* ${emergency}\n` +
      `*Correo:* ${email}\n\n` +
      `*ID de solicitud ASHIRA:* ${request.id}\n\n` +
      `Quedo en espera de contacto por parte de un especialista. ✅`
    );

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

    // 3. Notificar al Staff (ADMINISTRACION)
    try {
      const { data: staffUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'ADMINISTRACION');
      
      if (staffUsers) {
        for (const staff of staffUsers) {
          await sendNotification(staff.id, {
            title: '🚨 Nueva Solicitud SafeCare',
            body: `Paciente: ${details.beneficiaryName || 'Titular'} solicita ${planLabel}.`,
            url: '/dashboard/safecare'
          });
        }
      }

      // 4. Notificar al Paciente
      const { data: requesterUser } = await supabaseAdmin
        .from('users')
        .select('id, email, name')
        .eq('patientProfileId', patientId)
        .single();

      if (requesterUser) {
        await sendNotification(requesterUser.id, {
          title: '✅ Solicitud Recibida',
          body: 'Tu solicitud de SafeCare ha sido enviada. Pronto un especialista te contactará.',
          email: {
              to: requesterUser.email,
              subject: 'Confirmación de Solicitud SafeCare',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                  <h2 style="color: #4f46e5;">¡Hola ${requesterUser.name}!</h2>
                  <p>Hemos recibido con éxito tu solicitud para el plan <b>${planLabel}</b> de SafeCare 24/7.</p>
                  <p>Un especialista revisará los detalles y se pondrá en contacto contigo muy pronto.</p>
                  <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <p style="margin: 0;"><b>Detalles:</b> ${details.servicesSelected.join(', ')}</p>
                    <p style="margin: 5px 0 0 0;"><b>Dirección:</b> ${details.address}</p>
                  </div>
                  <p style="color: #64748b; font-size: 14px;">Gracias por confiar en ASHIRA.</p>
                </div>
              `
          }
        });
      }
    } catch (notifErr) {
      console.error('[createSafecareRequest] Error enviando notificaciones:', notifErr);
      // No bloqueamos el retorno si fallan las notificaciones
    }

    revalidatePath('/dashboard/patient/safecare');
    return { success: true, request, whatsappUrl };
  } catch (error) {
    console.error('[createSafecareRequest] Error:', error);
    return { success: false, error: 'No se pudo crear la solicitud.' };
  }
}

/**
 * Sube un documento de SafeCare y marca la solicitud como atendida.
 */
export async function uploadSafecareDocument(
  requestId: string,
  patientId: string,
  documentData: {
    type: string;
    url: string;
    name: string;
    size?: number;
    notes?: string;
  }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    // 1. Obtener el authId del paciente para las tablas que lo requieren (como informes médicos)
    const { data: patientUser } = await supabaseAdmin
      .from('users')
      .select('authId, id')
      .eq('patientProfileId', patientId)
      .single();

    // 2. Insertar en la tabla maestra de documentos de SafeCare (para el panel administrativo)
    const { error: docError } = await supabaseAdmin
      .from('safecare_documents')
      .insert({
        request_id: requestId,
        patient_id: patientId,
        document_type: documentData.type,
        file_url: documentData.url,
        file_name: documentData.name,
        file_size: documentData.size,
        notes: documentData.notes
      });

    if (docError) throw docError;

    // 3. Integración con el dashboard del paciente según el tipo de documento
    if (documentData.type === 'receta') {
      // Guardar en la tabla de prescripciones
      const { data: prescription, error: presError } = await supabaseAdmin
        .from('prescription')
        .insert({
          patient_id: patientId,
          doctor_id: adminUser?.id, // El admin que sube el archivo actúa como emisor
          notes: `Receta generada vía SafeCare. ${documentData.notes || ''}`,
          prescription_url: documentData.url,
          status: 'ACTIVE',
          issued_at: new Date().toISOString()
        })
        .select()
        .single();

      if (presError) throw presError;

      // Registrar el archivo en la tabla de archivos de prescripción
      await supabaseAdmin
        .from('prescription_files')
        .insert({
          prescription_id: prescription.id,
          file_url: documentData.url,
          file_name: documentData.name
        });

    } else {
      // Guardar en patient_medical_reports (Informes o Imágenes)
      const reportTypeMapping = {
        'informe_consulta': 'otro',
        'imagen_radiologia': 'imagen'
      };

      await supabaseAdmin
        .from('patient_medical_reports')
        .insert({
          patient_id: patientUser?.authId || patientId, // Usar authId si existe, fallback a patientId
          title: `SafeCare: ${documentData.name}`,
          report_type: (reportTypeMapping as any)[documentData.type] || 'otro',
          file_url: documentData.url,
          file_name: documentData.name,
          file_size: documentData.size,
          description: `Documento cargado por el equipo SafeCare. ${documentData.notes || ''}`,
          uploaded_by: adminUser?.id,
          created_at: new Date().toISOString()
        });
    }

    // 4. Notificar al Paciente
    try {
      if (patientUser) {
        const typeLabels: any = {
          'receta': 'una Prescripción Médica',
          'informe_consulta': 'un Informe Médico',
          'imagen_radiologia': 'Imágenes/RX'
        };
        const label = typeLabels[documentData.type] || 'un nuevo documento';

        await sendNotification(patientUser.id, {
          title: '📄 Nuevo Documento Disponible',
          body: `Se ha subido ${label} a tu historial clínico.`,
          url: documentData.type === 'receta' ? '/dashboard/patient/recetas' : '/dashboard/patient/informes',
          email: {
            to: (patientUser as any).email || '',
            subject: 'Nuevo documento en tu historial médico',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                <h2 style="color: #4f46e5;">¡Hola!</h2>
                <p>El equipo de SafeCare ha subido <b>${label}</b> a tu historial clínico.</p>
                <p>Ya puedes consultarlo y descargarlo desde tu panel de paciente en ASHIRA.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/patient" 
                   style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; margin-top: 10px;">
                  Ir a mi Panel
                </a>
              </div>
            `
          }
        });
      }
    } catch (notifErr) {
      console.error('[uploadSafecareDocument] Error enviando notificación:', notifErr);
    }

    // 5. Disparar verificación de Stage 2 de referidos
    await checkAndAwardStage2(patientId);

    revalidatePath('/dashboard/patient/safecare');
    revalidatePath('/dashboard/safecare');
    revalidatePath('/dashboard/patient/informes');
    revalidatePath('/dashboard/patient/recetas');
    
    return { success: true };
  } catch (error) {
    console.error('[uploadSafecareDocument] Error:', error);
    return { success: false, error: 'Error al subir e integrar el documento.' };
  }
}

/**
 * Obtiene todas las solicitudes de SafeCare para un paciente.
 */
export async function getPatientSafecareRequests(patientId: string) {
  try {
    const { data: requests, error } = await supabaseAdmin
      .from('safecare_requests')
      .select('*, documents:safecare_documents(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return requests as any[];
  } catch (error) {
    console.error('[getPatientSafecareRequests] Error:', error);
    return [];
  }
}

/**
 * Actualiza el estado de una solicitud de SafeCare.
 */
export async function updateSafecareStatus(requestId: string, status: 'requested' | 'contacted' | 'attended') {
  try {
    const { error } = await supabaseAdmin
      .from('safecare_requests')
      .update({ 
        status,
        attended_at: status === 'attended' ? new Date().toISOString() : undefined
      })
      .eq('id', requestId);

    if (error) throw error;

    // Notificar al paciente si el estado cambia a 'contactado'
    if (status === 'contacted') {
      try {
        const { data: request } = await supabaseAdmin
          .from('safecare_requests')
          .select('patient_id')
          .eq('id', requestId)
          .single();
        
        if (request) {
          const { data: patientUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('patientProfileId', request.patient_id)
            .single();
          
          if (patientUser) {
            await sendNotification(patientUser.id, {
              title: '🤝 Contacto Iniciado',
              body: 'Un especialista de SafeCare ha comenzado a revisar tu solicitud.',
              url: '/dashboard/patient/safecare'
            });
          }
        }
      } catch (notifErr) {
        console.error('[updateSafecareStatus] Error enviando notificación:', notifErr);
      }
    }

    revalidatePath('/dashboard/safecare');
    return { success: true };
  } catch (error) {
    console.error('[updateSafecareStatus] Error:', error);
    return { success: false, error: 'Error al actualizar el estado.' };
  }
}

/**
 * Obtiene todas las solicitudes para el portal de Staff de SafeCare.
 */
export async function getAllSafecareRequests() {
  try {
    const { data, error } = await supabaseAdmin
      .from('safecare_requests')
      .select(`
        *,
        patient:patient!patient_id (firstName, lastName),
        beneficiary:patient!beneficiary_id (firstName, lastName)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any[];
  } catch (error) {
    console.error('[getAllSafecareRequests] Error:', error);
    return [];
  }
}

/**
 * Elimina una solicitud de SafeCare.
 */
export async function deleteSafecareRequest(requestId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('safecare_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
    revalidatePath('/dashboard/safecare');
    return { success: true };
  } catch (error) {
    console.error('[deleteSafecareRequest] Error:', error);
    return { success: false, error: 'Error al eliminar la solicitud.' };
  }
}
