'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useNurseState } from '@/context/NurseContext';
import { getIndependentPatients } from '@/lib/supabase/nurse.service';
import { getReferredDoctors, ReferredDoctor, uploadNurseRecordFile, createNursePatientRecord } from '@/lib/supabase/nurse-doctors.service';
import { FileText, UploadCloud, Stethoscope, Type, Save, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewMedicalHistoryPage() {
  const router = useRouter();
  const { nurseProfile } = useNurseState();
  
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<ReferredDoctor[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);

  const [inputType, setInputType] = useState<'FILE' | 'TRANSCRIPTION'>('FILE');
  
  const [formData, setFormData] = useState({
    patient_id: '',
    referred_doctor_id: '',
    record_type: 'INFORME_DOCTOR',
    title: '',
    description: '',
    record_date: new Date().toISOString().split('T')[0],
    transcription: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!nurseProfile?.nurse_profile_id || !nurseProfile?.user_id) return;
      try {
        const [patientsData, doctorsData] = await Promise.all([
          getIndependentPatients(nurseProfile.user_id),
          getReferredDoctors(nurseProfile.nurse_profile_id)
        ]);
        setPatients(patientsData);
        setDoctors(doctorsData);
      } catch (err) {
        console.error(err);
        toast.error('Error cargando datos de pacientes y doctores');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [nurseProfile?.nurse_profile_id, nurseProfile?.user_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseProfile?.nurse_profile_id) return;
    if (!formData.patient_id) { toast.error('Debes seleccionar un paciente'); return; }
    if (!formData.title) { toast.error('El título es obligatorio'); return; }
    
    if (inputType === 'FILE' && !selectedFile) {
      toast.error('Debes adjuntar un archivo'); return;
    }
    if (inputType === 'TRANSCRIPTION' && !formData.transcription) {
      toast.error('La transcripción no puede estar vacía'); return;
    }

    setSaving(true);
    try {
      let file_url = undefined;

      if (inputType === 'FILE' && selectedFile) {
        const { url, error: uploadErr } = await uploadNurseRecordFile(selectedFile, nurseProfile.nurse_profile_id);
        if (uploadErr) throw new Error(uploadErr);
        file_url = url || undefined;
      }

      const { data, error } = await createNursePatientRecord({
        nurse_id: nurseProfile.nurse_profile_id,
        patient_id: formData.patient_id,
        referred_doctor_id: formData.referred_doctor_id || undefined,
        record_type: formData.record_type,
        title: formData.title,
        description: formData.description,
        record_date: formData.record_date,
        transcription: inputType === 'TRANSCRIPTION' ? formData.transcription : undefined,
        file_url
      });

      if (error) throw new Error(error);

      toast.success('Registro guardado exitosamente');
      router.push('/dashboard/nurse/independent/history');
    } catch (err: any) {
      toast.error(err.message || 'Ocurrió un error al guardar el historial');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/nurse/independent/history" className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-teal-600" /> Cargar Historial
          </h1>
          <p className="text-sm text-gray-500">
            Sube documentos físicos (PDF, Imágenes) o transcribe reportes manualmente.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Paciente *</label>
              <select required name="patient_id" value={formData.patient_id} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900 appearance-none custom-select-arrow">
                <option value="">-- Seleccionar Paciente --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Doctor Referente (Opcional)</label>
              <select name="referred_doctor_id" value={formData.referred_doctor_id} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900 appearance-none custom-select-arrow">
                <option value="">-- No Aplica --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.doctor_name} ({d.specialty || 'General'})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Título del Documento *</label>
              <input type="text" required name="title" value={formData.title} onChange={handleChange} placeholder="Ej. Resultados de Sangre" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Categoría</label>
              <select name="record_type" value={formData.record_type} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900 appearance-none custom-select-arrow">
                <option value="INFORME_DOCTOR">Informe Médico</option>
                <option value="LABORATORIOS">Exámenes / Estudios</option>
                <option value="REPORTE_ENFERMERIA">Reporte de Enfermería</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Fecha del Documento *</label>
              <div className="relative">
                <input type="date" required name="record_date" value={formData.record_date} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" />
                <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">Descripción breve (Opcional)</label>
              <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Detalles adicionales sobre el documento..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" />
            </div>
          </div>
        </div>

        {/* Action Type Toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-xl self-start w-max">
            <button
              type="button"
              onClick={() => setInputType('FILE')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${inputType === 'FILE' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}`}
            >
              <FileText className="w-4 h-4" /> Adjuntar Archivo
            </button>
            <button
              type="button"
              onClick={() => setInputType('TRANSCRIPTION')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${inputType === 'TRANSCRIPTION' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}`}
            >
              <Type className="w-4 h-4" /> Transcribir Físico
            </button>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {inputType === 'FILE' ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8 text-teal-600" />
                </div>
                {selectedFile ? (
                  <>
                    <p className="text-lg font-bold text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p className="text-teal-600 text-sm font-bold mt-4 hover:underline">Haga clic para cambiar el archivo</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-gray-900">Selecciona o arrastra un archivo</p>
                    <p className="text-sm text-gray-500 mt-1">Soporta PDF, Word (DOCX) e Imágenes principales.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Transcripción de Reporte</label>
                <textarea 
                  name="transcription" 
                  value={formData.transcription} 
                  onChange={handleChange} 
                  rows={10} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-y text-gray-900 leading-relaxed" 
                  placeholder="Escribe textualmente lo que indica el reporte físico aquí..."
                ></textarea>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/nurse/independent/history" className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-teal-600/20">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Guardando...' : 'Guardar y Archivar'}
          </button>
        </div>

      </form>
    </div>
  );
}
