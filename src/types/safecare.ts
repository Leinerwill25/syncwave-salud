// src/types/safecare.ts

export type SafecarePlanType = 'atencion_puntual' | 'revitalizacion_bienestar';
export type SafecareRequestStatus = 'requested' | 'contacted' | 'attended' | 'cancelled';
export type SafecareDocumentType = 'informe_consulta' | 'resultado_laboratorio' | 'imagen_radiologia' | 'receta' | 'otro';
export type SafecareZone = 'caracas' | 'altos_mirandinos' | 'guarenas_guatire';

export interface SafecareRequest {
  id: string;
  patient_id: string;
  referral_id?: string;
  plan_type: SafecarePlanType;
  service_details: any;
  patient_address: string;
  patient_zone: SafecareZone;
  preferred_datetime?: string;
  patient_notes?: string;
  whatsapp_sent: boolean;
  status: SafecareRequestStatus;
  attended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SafecareDocument {
  id: string;
  request_id: string;
  patient_id: string;
  document_type: SafecareDocumentType;
  file_url: string;
  file_name: string;
  file_size?: number;
  uploaded_by?: string;
  notes?: string;
  created_at: string;
}
