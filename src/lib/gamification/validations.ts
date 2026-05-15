import { SupabaseClient } from '@supabase/supabase-js';

// Mapeo de puntos por misión
export const MISSION_POINTS: Record<string, number> = {
  M1: 50,
  M2: 50,
  M3: 50,
  M4: 100,
  M5: 50,
  M6: 100,
  M7: 150,
  M8: 50,
};

// Mapeo de módulos por nivel de puntos
export const MODULE_LOCKS = [
  { minPoints: 0, modules: ['dashboard', 'configuracion'] },
  { minPoints: 150, modules: ['pacientes', 'citas'] },
  { minPoints: 350, modules: ['consultas', 'recetas', 'url-publica'] },
  { minPoints: 600, modules: ['reportes', 'lab-upload-link', 'mensajeria'] },
];

export function calculateLevel(points: number): number {
  if (points >= 350) return 3;
  if (points >= 150) return 2;
  return 1;
}

export function getUnlockedModules(points: number): string[] {
  const unlocked: string[] = [];
  MODULE_LOCKS.forEach((tier) => {
    if (points >= tier.minPoints) {
      unlocked.push(...tier.modules);
    }
  });
  return unlocked;
}

// Validaciones individuales

export async function validateM1(supabase: SupabaseClient, organizationId: string): Promise<boolean> {
  if (!organizationId) return false;
  const { data, error } = await supabase
    .from('clinic_profile')
    .select('legal_name, phone_mobile, contact_email')
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) return false;
  return !!(data.legal_name && data.phone_mobile && data.contact_email);
}

export async function validateM2(supabase: SupabaseClient, doctorId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('medic_profile')
    .select('photo_url')
    .eq('doctor_id', doctorId)
    .single();

  if (error || !data) return false;
  return !!(data.photo_url && data.photo_url.trim() !== '');
}

export async function validateM3(supabase: SupabaseClient, organizationId: string): Promise<boolean> {
  if (!organizationId) return false;
  const { data, error } = await supabase
    .from('clinic_profile')
    .select('photos')
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) return false;
  
  let photos: any[] = [];
  try {
    photos = Array.isArray(data.photos) ? data.photos : typeof data.photos === 'string' ? JSON.parse(data.photos) : [];
  } catch {
    photos = [];
  }
  
  return photos.length >= 3;
}

export async function validateM4(supabase: SupabaseClient, organizationId: string): Promise<boolean> {
  if (!organizationId) return false;
  const { data, error } = await supabase
    .from('clinic_profile')
    .select('location')
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) return false;
  
  let location: any = null;
  try {
    location = typeof data.location === 'string' ? JSON.parse(data.location) : data.location;
  } catch {
    location = null;
  }
  
  return !!(location && (location.lat || location.latitude) && (location.lng || location.longitude));
}

export async function validateM5(supabase: SupabaseClient, organizationId: string): Promise<boolean> {
  if (!organizationId) return false;
  const { data, error } = await supabase
    .from('clinic_profile')
    .select('currency')
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) return false;
  return !!(data.currency && data.currency.trim() !== '');
}

export async function validateM6(supabase: SupabaseClient, doctorId: string): Promise<boolean> {
  // Verificar si tiene al menos una plantilla guardada en report_templates_by_specialty
  const { data, error } = await supabase
    .from('medic_profile')
    .select('report_templates_by_specialty')
    .eq('doctor_id', doctorId)
    .single();

  if (error || !data) return false;
  
  const templates = data.report_templates_by_specialty;
  if (!templates) return false;
  
  // Si es un objeto JSON, verificar si tiene alguna clave (especialidad) con datos
  if (typeof templates === 'object') {
    const keys = Object.keys(templates);
    if (keys.length === 0) return false;
    
    // Verificar si al menos una plantilla tiene URL o texto
    for (const key of keys) {
      const t = templates[key];
      if (t && (t.template_url || t.template_text || t.texto_estructura)) {
        return true;
      }
      // Si es obstetricia, puede tener variantes
      if (t && (t.trimestre1 || t.trimestre2_3 || t.variants)) {
        return true;
      }
    }
  }
  
  return false;
}

export async function validateM7(supabase: SupabaseClient, doctorId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('waha_sessions')
    .select('status')
    .eq('doctor_id', doctorId)
    .eq('status', 'WORKING')
    .limit(1);

  if (error || !data || data.length === 0) return false;
  return true;
}

export async function validateM8(supabase: SupabaseClient, doctorId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('plantilla_receta')
    .select('id')
    .eq('doctor_id', doctorId)
    .limit(1);

  if (error || !data || data.length === 0) return false;
  return true;
}

// Función para correr todas las validaciones (Retroactividad)
export async function runAllValidations(supabase: SupabaseClient, doctorId: string, organizationId: string | null): Promise<string[]> {
  const completedMissions: string[] = [];
  
  if (organizationId && await validateM1(supabase, organizationId)) completedMissions.push('M1');
  if (await validateM2(supabase, doctorId)) completedMissions.push('M2');
  if (organizationId && await validateM3(supabase, organizationId)) completedMissions.push('M3');
  if (organizationId && await validateM4(supabase, organizationId)) completedMissions.push('M4');
  if (organizationId && await validateM5(supabase, organizationId)) completedMissions.push('M5');
  if (await validateM6(supabase, doctorId)) completedMissions.push('M6');
  if (await validateM7(supabase, doctorId)) completedMissions.push('M7');
  if (await validateM8(supabase, doctorId)) completedMissions.push('M8');
  
  return completedMissions;
}
