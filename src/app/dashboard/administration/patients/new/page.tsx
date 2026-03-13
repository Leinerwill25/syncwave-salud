'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminPatientSchema, AdminPatientFormValues } from '@/lib/schemas/adminPatientSchema';
import { UserPlus, ArrowLeft, Loader2, Save, AlertCircle, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DynamicListInputProps {
    label: string;
    field: 'allergies' | 'medications' | 'history';
    placeholder: string;
    values: string[];
    handleDynamicInput: (field: 'allergies' | 'medications' | 'history', index: number, value: string) => void;
    handleKeyDown: (e: React.KeyboardEvent, field: 'allergies' | 'medications' | 'history', index: number) => void;
    removeDynamicInput: (field: 'allergies' | 'medications' | 'history', index: number) => void;
    addDynamicInput: (field: 'allergies' | 'medications' | 'history') => void;
}

const DynamicListInput = ({ 
    label, 
    field, 
    placeholder,
    values,
    handleDynamicInput,
    handleKeyDown,
    removeDynamicInput,
    addDynamicInput
}: DynamicListInputProps) => (
    <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">{label}</label>
        {values.map((val, idx) => (
            <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                <input 
                    type="text"
                    value={val}
                    onChange={e => handleDynamicInput(field, idx, e.target.value)}
                    onKeyDown={e => handleKeyDown(e, field, idx)}
                    className="flex-1 p-2 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-teal-100 focus:ring-2 bg-slate-50 outline-none transition-all text-sm"
                    placeholder={placeholder}
                    autoFocus={idx > 0 && val === ''}
                />
                <button 
                    type="button"
                    onClick={() => removeDynamicInput(field, idx)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white border border-slate-200 rounded-xl"
                >
                    <Trash2 size={16} />
                </button>
                {idx === values.length - 1 && (
                    <button 
                        type="button"
                        onClick={() => addDynamicInput(field)}
                        className="p-2 text-teal-600 hover:bg-teal-50 transition-colors bg-white border border-teal-100 rounded-xl"
                    >
                        <Plus size={16} />
                    </button>
                )}
            </div>
        ))}
    </div>
);

export default function NewAdminPatientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [allergiesList, setAllergiesList] = useState<string[]>(['']);
  const [medicationsList, setMedicationsList] = useState<string[]>(['']);
  const [historyList, setHistoryList] = useState<string[]>(['']);

  const handleDynamicInput = (field: 'allergies' | 'medications' | 'history', index: number, value: string) => {
    if (field === 'allergies') {
        const current = [...allergiesList]; current[index] = value; setAllergiesList(current);
    } else if (field === 'medications') {
        const current = [...medicationsList]; current[index] = value; setMedicationsList(current);
    } else if (field === 'history') {
        const current = [...historyList]; current[index] = value; setHistoryList(current);
    }
  };
  
  const addDynamicInput = (field: 'allergies' | 'medications' | 'history') => {
    if (field === 'allergies') setAllergiesList(prev => [...prev, '']);
    else if (field === 'medications') setMedicationsList(prev => [...prev, '']);
    else if (field === 'history') setHistoryList(prev => [...prev, '']);
  };
  
  const removeDynamicInput = (field: 'allergies' | 'medications' | 'history', index: number) => {
    if (field === 'allergies') {
        if (allergiesList.length > 1) setAllergiesList(prev => prev.filter((_, i) => i !== index));
        else setAllergiesList(['']);
    } else if (field === 'medications') {
        if (medicationsList.length > 1) setMedicationsList(prev => prev.filter((_, i) => i !== index));
        else setMedicationsList(['']);
    } else if (field === 'history') {
        if (historyList.length > 1) setHistoryList(prev => prev.filter((_, i) => i !== index));
        else setHistoryList(['']);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'allergies' | 'medications' | 'history', index: number) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          addDynamicInput(field);
      }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminPatientSchema),
    defaultValues: {
      isActive: true,
    }
  });

  const onSubmit = async (data: AdminPatientFormValues) => {
    setIsSubmitting(true);
    setErrorMsg('');

    // Unir arreglos en formato string para que hagan match con el esquema y bd
    data.allergies = allergiesList.filter(s => s.trim() !== '').join(', ');
    data.currentMedications = medicationsList.filter(s => s.trim() !== '').join(', ');
    data.medicalHistory = historyList.filter(s => s.trim() !== '').join('\n\n');

    try {
      const response = await fetch('/api/administration/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el paciente');
      }

      toast.success('Paciente registrado correctamente');
      router.push('/dashboard/administration/patients');
      router.refresh();
      
    } catch (error: any) {
      setErrorMsg(error.message);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/administration/patients" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver a Pacientes
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-600" />
            Registro de Paciente
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Añade un nuevo paciente al directorio de la clínica.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
            {/* Informacion Principal */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900 border-b pb-3 flex items-center gap-2">
                 <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black">1</div>
                 Datos Generales
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nombre(s) *</label>
                  <input 
                    {...register('firstName')}
                    autoFocus
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm",
                      errors.firstName ? "border-red-500" : "border-slate-200"
                    )}
                  />
                  {errors.firstName && <p className="text-xs font-bold text-red-500">{errors.firstName.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Apellido(s) *</label>
                  <input 
                    {...register('lastName')}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm",
                      errors.lastName ? "border-red-500" : "border-slate-200"
                    )}
                  />
                  {errors.lastName && <p className="text-xs font-bold text-red-500">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Fecha de Nacimiento</label>
                    <input 
                      type="date"
                      {...register('dateOfBirth')}
                      className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm border-slate-200 text-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Teléfono</label>
                    <input 
                      {...register('phoneNumber')}
                      className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm border-slate-200"
                    />
                  </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Correo Electrónico</label>
                <input 
                  type="email"
                  {...register('email')}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm",
                    errors.email ? "border-red-500" : "border-slate-200"
                  )}
                />
                {errors.email && <p className="text-xs font-bold text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-4 pt-4">
                 <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Ubicación</h4>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección Completa</label>
                    <input {...register('address')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm border-slate-200" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ciudad</label>
                        <input {...register('city')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm border-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">País</label>
                        <input {...register('country')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:bg-white text-sm border-slate-200" />
                    </div>
                 </div>
              </div>
            </div>

            {/* Informacion Medica & Emergencia */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900 border-b pb-3 flex items-center gap-2">
                   <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 font-black">2</div>
                   Contacto de Emergencia
                </h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nombre del Contacto</label>
                  <input {...register('emergencyContactName')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-rose-100 focus:bg-white text-sm border-slate-200" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Teléfono Auxiliar</label>
                      <input {...register('emergencyContactPhone')} className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-rose-100 focus:bg-white text-sm border-slate-200" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Parentesco</label>
                      <input {...register('emergencyContactRelation')} placeholder="Ej: Madre, Esposo..." className="w-full rounded-xl border px-4 py-3 bg-slate-50 outline-none transition-all focus:ring-4 focus:ring-rose-100 focus:bg-white text-sm border-slate-200" />
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900 border-b pb-3 flex items-center gap-2">
                   <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-black">3</div>
                   Datos Clínicos Adicionales
                </h3>
                
                <h4 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Antecedentes Médicos (Presiona Enter para añadir otro)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <DynamicListInput 
                        label="Alergias Conocidas" 
                        field="allergies" 
                        placeholder="Ej. Penicilina" 
                        values={allergiesList}
                        handleDynamicInput={handleDynamicInput}
                        handleKeyDown={handleKeyDown}
                        addDynamicInput={addDynamicInput}
                        removeDynamicInput={removeDynamicInput}
                    />
                    
                    <DynamicListInput 
                        label="Medicamentos Actuales" 
                        field="medications" 
                        placeholder="Ej. Metformina 500mg" 
                        values={medicationsList}
                        handleDynamicInput={handleDynamicInput}
                        handleKeyDown={handleKeyDown}
                        addDynamicInput={addDynamicInput}
                        removeDynamicInput={removeDynamicInput}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="md:col-span-2">
                        <DynamicListInput 
                            label="Antecedentes Relevantes (Breves)" 
                            field="history" 
                            placeholder="Ej. Operación de apéndice (2010)" 
                            values={historyList}
                            handleDynamicInput={handleDynamicInput}
                            handleKeyDown={handleKeyDown}
                            addDynamicInput={addDynamicInput}
                            removeDynamicInput={removeDynamicInput}
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-3 pt-4">
                  <input 
                    type="checkbox"
                    id="isActive"
                    {...register('isActive')}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Paciente Activo
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-10 py-4 rounded-xl font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 text-lg uppercase tracking-widest min-w-[280px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" /> REGISTRAR PACIENTE
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
