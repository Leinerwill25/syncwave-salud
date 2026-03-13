'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  ArrowLeft, 
  Upload, 
  User, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  identifier?: string;
}

const DOCUMENT_TYPES = [
  { value: 'HISTORIA_CLINICA', label: 'Historia Clínica' },
  { value: 'IMAGEN', label: 'Imagen diagnóstica' },
  { value: 'REPORTE', label: 'Reporte médico' },
  { value: 'EXAMEN', label: 'Examen de laboratorio' },
  { value: 'CERTIFICADO', label: 'Certificado médico' },
  { value: 'OTRO', label: 'Otro' },
];

export default function NewDocumentPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    documentType: 'HISTORIA_CLINICA',
    description: '',
    fileName: '',
    filePath: '', // Simulado
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/administration/patients');
      const data = await res.json();
      setPatients(data.data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !formData.fileName) {
      setError('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Simulación de subida: Generamos un path ficticio
      const finalData = {
        ...formData,
        filePath: `https://storage.ashira.click/docs/${formData.patientId}/${Date.now()}_${formData.fileName}`,
        fileSizeBytes: Math.floor(Math.random() * 5000000) + 100000,
        mimeType: formData.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
      };

      const res = await fetch('/api/administration/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      if (!res.ok) throw new Error('Error al guardar el documento');

      setSuccess(true);
      setTimeout(() => router.push('/dashboard/administration/documents'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link 
        href="/dashboard/administration/documents"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Documentos
      </Link>

      <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-emerald-500" />
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cargar Nuevo Documento</h1>
            <p className="text-slate-500 text-sm italic">Asocia archivos importantes a la ficha del paciente.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Paciente */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" /> Paciente *
              </label>
              <select
                required
                disabled={isLoadingPatients}
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-shadow disabled:opacity-50"
              >
                <option value="">Selecciona un paciente...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.identifier ? `(${p.identifier})` : ''}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Documento */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" /> Tipo de Documento *
              </label>
              <select
                required
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Nombre del Archivo */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Nombre del Archivo (o link) *</label>
              <input
                type="text"
                required
                placeholder="Ej: Informe_Radiologico_Marzo_2024.pdf"
                value={formData.fileName}
                onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-shadow"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Descripción / Notas Adicionales</label>
              <textarea
                placeholder="Detalles adicionales sobre el documento..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-shadow resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border border-rose-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ¡Documento subido con éxito! Redirigiendo...
            </div>
          )}

          <div className="pt-4 border-t border-slate-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-slate-500/10 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <FileCheck className="w-5 h-5" />
                  Subir Documento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
