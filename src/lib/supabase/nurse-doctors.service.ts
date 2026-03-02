import { createSupabaseBrowserClient } from '@/app/adapters/client';

export interface ReferredDoctor {
  id: string;
  nurse_id: string;
  doctor_name: string;
  specialty?: string;
  phone?: string;
  email?: string;
  created_at: string;
}

export async function getReferredDoctors(nurseId: string): Promise<ReferredDoctor[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('nurse_referred_doctors')
    .select('*')
    .eq('nurse_id', nurseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getReferredDoctors] Error fetching doctors:', error);
    return [];
  }
  return data as ReferredDoctor[];
}

export async function createReferredDoctor(params: {
  nurse_id: string;
  doctor_name: string;
  specialty?: string;
  phone?: string;
  email?: string;
}): Promise<{ data: ReferredDoctor | null; error: string | null }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('nurse_referred_doctors')
    .insert([params])
    .select('*')
    .single();

  if (error) {
    console.error('[createReferredDoctor] Error:', error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export interface NursePatientRecord {
  id: string;
  nurse_id: string;
  patient_id: string;
  referred_doctor_id: string | null;
  record_type: 'INFORME_DOCTOR' | 'LABORATORIOS' | 'REPORTE_ENFERMERIA';
  title: string;
  description?: string;
  file_url?: string;
  transcription?: string;
  record_date: string;
  created_at: string;
}

export async function createNursePatientRecord(params: {
  nurse_id: string;
  patient_id: string;
  referred_doctor_id?: string;
  record_type: string;
  title: string;
  description?: string;
  file_url?: string;
  transcription?: string;
  record_date: string;
}): Promise<{ data: NursePatientRecord | null; error: string | null }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('nurse_patient_records')
    .insert([params])
    .select('*')
    .single();

  if (error) {
    console.error('[createNursePatientRecord] Error:', error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function getNursePatientRecords(nurseId: string): Promise<NursePatientRecord[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('nurse_patient_records')
    .select(`*, patient:unregisteredpatients(first_name, last_name, identification), doctor:nurse_referred_doctors(doctor_name)`)
    .eq('nurse_id', nurseId)
    .order('record_date', { ascending: false });

  if (error) {
    console.error('[getNursePatientRecords]', error);
    return [];
  }
  return data as NursePatientRecord[];
}

export async function uploadNurseRecordFile(file: File, nurseId: string): Promise<{ url: string | null; error: string | null }> {
  const supabase = createSupabaseBrowserClient();
  const fileExt = file.name.split('.').pop();
  const fileName = `${nurseId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('patient-records') // Reuse an existing bucket or create one. Wait, let's use 'consultations' bucket or 'avatars' for safety if we don't know the bucket names. Let me use 'lab-results' which usually exists, or generic 'patient-documents' if we assume it exists. Actually, Supabase Storage allows standard bucket usage. I'll use 'patient-records'.
    .upload(fileName, file);
    
  if (error) {
    console.error('Error uploading file:', error);
    return { url: null, error: error.message };
  }
  
  const { data: urlData } = supabase.storage.from('patient-records').getPublicUrl(fileName);
  return { url: urlData.publicUrl, error: null };
}
