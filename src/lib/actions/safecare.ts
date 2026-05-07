'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { checkAndAwardStage2 } from './referrals';
import { SafecarePlanType, SafecareZone, SafecareRequest } from '@/types/safecare';
import { revalidatePath } from 'next/cache';

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
          beneficiaryName: details.beneficiaryName || 'Titular'
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
      `*ID de solicitud ASHIRA:* ${request.id}\n\n` +
      `Quedo en espera de contacto por parte de un especialista. ✅`
    );

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

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
    // 1. Insertar en safecare_documents
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

    // 2. Integración A: Insertar también en patient_medical_reports para el historial
    await supabaseAdmin
      .from('patient_medical_reports')
      .insert({
        patient_id: patientId,
        report_type: 'otro',
        title: `SafeCare: ${documentData.name}`,
        file_url: documentData.url,
        notes: `Documento subido por SafeCare. Notas: ${documentData.notes || 'Ninguna'}`,
        created_at: new Date().toISOString()
      });

    // 3. Disparar verificación de Stage 2 de referidos
    await checkAndAwardStage2(patientId);

    revalidatePath('/dashboard/patient/safecare');
    revalidatePath('/dashboard/safecare');
    return { success: true };
  } catch (error) {
    console.error('[uploadSafecareDocument] Error:', error);
    return { success: false, error: 'Error al subir el documento.' };
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
      .update({ status })
      .eq('id', requestId);

    if (error) throw error;
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
        patient:patient_id (firstName, lastName),
        beneficiary:beneficiary_id (firstName, lastName)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any[];
  } catch (error) {
    console.error('[getAllSafecareRequests] Error:', error);
    return [];
  }
}
