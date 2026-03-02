'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, ArrowLeft, Loader2, Save, FileText, Activity, Users } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createIndependentPatient } from '@/lib/supabase/nurse.service';

export default function NewPatientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    identification: '',
    phone: '',
    email: '',
    sex: 'OTHER',
    birth_date: '',
    allergies: '',
    chronic_conditions: '',
    family_history: '',
    current_medication: '',
    motive: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.phone) {
      toast.error('El nombre y el teléfono son obligatorios.');
      return;
    }
    
    setSaving(true);
    try {
      const { data, error } = await createIndependentPatient(formData);
      if (error) throw new Error(error);
      
      toast.success('Paciente registrado exitosamente');
      router.push(`/dashboard/nurse/independent/patients`);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear paciente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/nurse/independent/patients" className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-teal-600" /> Nuevo Paciente
          </h1>
          <p className="text-sm text-gray-500">
            Registra a un nuevo paciente y completa su información médica inicial.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreatePatient} className="space-y-6">
        
        {/* Personal Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50/50 border-b border-gray-200 px-6 py-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-800">Datos Personales</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Nombres *</label>
              <input type="text" name="first_name" required value={formData.first_name} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="Ej. Juan" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Apellidos</label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="Ej. Pérez" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Cédula / Pasaporte</label>
              <input type="text" name="identification" value={formData.identification} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="V-12345678" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Fecha de Nacimiento</label>
              <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Teléfono *</label>
              <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="0414-0000000" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Correo Electrónico</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="correo@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Sexo</label>
              <select name="sex" value={formData.sex} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900 appearance-none custom-select-arrow">
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Medical History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-teal-50/50 border-b border-teal-100 px-6 py-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-teal-900">Historial Clínico <span className="text-sm font-normal text-teal-600 ml-2">(Opcional)</span></h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">Alergias Conocidas</label>
              <textarea name="allergies" value={formData.allergies} onChange={handleChange} rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none text-gray-900" placeholder="Indicar si el paciente tiene alergias a medicamentos, alimentos, látex, etc."></textarea>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Condiciones Crónicas / Generales</label>
              <textarea name="chronic_conditions" value={formData.chronic_conditions} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none text-gray-900" placeholder="Hipertensión, asma, diabetes..."></textarea>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Antecedentes Familiares</label>
              <textarea name="family_history" value={formData.family_history} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none text-gray-900" placeholder="Antecedentes importantes de familiares directos..."></textarea>
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">Medicamentos Actuales</label>
              <input type="text" name="current_medication" value={formData.current_medication} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="Listar medicamentos que toma frecuentemente..." />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">Motivo de Registro</label>
              <input type="text" name="motive" value={formData.motive} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="Razón principal por la que entra bajo el cuidado de la enfermera..." />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/nurse/independent/patients" className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-teal-600/20">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Guardando...' : 'Guardar Paciente'}
          </button>
        </div>
      </form>
    </div>
  );
}
