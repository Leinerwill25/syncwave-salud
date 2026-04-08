import { createSupabaseBrowserClient } from '@/app/adapters/client';

/**
 * Sube un archivo al bucket 'medic-profiles' de Supabase Storage.
 * @param file Archivo a subir
 * @param folder Carpeta dentro del bucket (ej: 'photos', 'signatures', 'credentials')
 * @returns { url: string | null, error: string | null }
 */
export async function uploadMedicFile(file: File, folder: string): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = createSupabaseBrowserClient();
    
    // Validar tipo de archivo (opcional pero recomendado)
    if (!file) return { url: null, error: 'No se ha proporcionado ningún archivo.' };

    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('medic-profiles')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[uploadMedicFile] Error:', error);
      return { url: null, error: error.message };
    }

    // Obtener la URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('medic-profiles')
      .getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (err: any) {
    console.error('[uploadMedicFile] Catch Error:', err);
    return { url: null, error: err.message || 'Error desconocido al subir archivo' };
  }
}

/**
 * Elimina un archivo de Supabase Storage dada su URL pública.
 * @param url URL pública del archivo
 */
export async function deleteMedicFile(url: string): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!url) return { success: true, error: null };
    
    const supabase = createSupabaseBrowserClient();
    
    // Extraer el path relativo de la URL pública
    // Ejemplo URL: https://xxx.supabase.co/storage/v1/object/public/medic-profiles/photos/123.jpg
    // El path es 'photos/123.jpg'
    const parts = url.split('/medic-profiles/');
    if (parts.length < 2) return { success: false, error: 'URL inválida para este bucket.' };
    
    const filePath = parts[1];
    
    const { error } = await supabase.storage
      .from('medic-profiles')
      .remove([filePath]);

    if (error) {
      console.error('[deleteMedicFile] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[deleteMedicFile] Catch Error:', err);
    return { success: false, error: err.message || 'Error al eliminar archivo' };
  }
}
