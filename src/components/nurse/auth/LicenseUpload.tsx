'use client';
// src/components/nurse/auth/LicenseUpload.tsx
// ─── Subida de foto / PDF de licencia a Supabase Storage ──
import { useState, useRef } from 'react';
import { Upload, X, FileImage, CheckCircle, Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  onUploadComplete?: (url: string) => void;
  className?: string;
}

export function LicenseUpload({ onUploadComplete, className }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      toast.error('El archivo debe ser menor a 5 MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(f.type)) {
      toast.error('Solo se permiten imágenes (JPG, PNG, WEBP) o PDF');
      return;
    }

    setFile(f);
    setUploadedUrl(null);

    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split('.').pop();
      const fileName = `license_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('nurse-documents')
        .upload(fileName, file, { upsert: true });

      if (error) {
        toast.error('Error al subir el archivo: ' + error.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('nurse-documents')
        .getPublicUrl(data.path);

      setUploadedUrl(urlData.publicUrl);
      onUploadComplete?.(urlData.publicUrl);
      toast.success('Licencia subida correctamente');
    } catch {
      toast.error('Error inesperado al subir el archivo');
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setFile(null);
    setPreview(null);
    setUploadedUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
        Foto de licencia / colegiatura <span className="text-gray-400">(opcional)</span>
      </label>

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-all group"
        >
          <Upload className="w-8 h-8 text-gray-400 group-hover:text-teal-500 transition-colors" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Subir documento</p>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP o PDF — máx. 5 MB</p>
          </div>
        </button>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa licencia" className="w-full h-40 object-contain bg-gray-50 dark:bg-gray-800" />
          ) : (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800">
              <FileImage className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            {uploadedUrl ? (
              <div className="flex items-center gap-2 flex-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Subida correctamente</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Subiendo...' : 'Subir ahora'}
              </button>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Quitar
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
