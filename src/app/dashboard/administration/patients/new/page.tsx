'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminPatientSchema, AdminPatientFormValues } from '@/lib/schemas/adminPatientSchema';
import { UserPlus, ArrowLeft, Loader2, Save, AlertCircle, Trash2, Plus, Activity, Package, Pill, Layers } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Search, Calendar as CalendarIcon, Check, X } from 'lucide-react';

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

  // Home Care State
  const [services, setServices] = useState<any[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [isLoadingHomeCare, setIsLoadingHomeCare] = useState(true);
  
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedSpecialists, setSelectedSpecialists] = useState<string[]>([]);
  const [searchSpecialist, setSearchSpecialist] = useState('');
  const [searchService, setSearchService] = useState('');
  const [showSpecDropdown, setShowSpecDropdown] = useState(false);
  const [showServDropdown, setShowServDropdown] = useState(false);

  // Home Care Inventory State
  const [medications, setMedications] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [showInvDropdown, setShowInvDropdown] = useState(false);
  const [selectedInvItems, setSelectedInvItems] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [servRes, specRes, medsRes, matsRes] = await Promise.all([
          fetch('/api/administration/services'),
          fetch('/api/administration/specialists?limit=100'),
          fetch('/api/administration/inventory/medications?limit=100'),
          fetch('/api/administration/inventory/materials?limit=100')
        ]);
        const servData = await servRes.json();
        const specData = await specRes.json();
        const medsData = await medsRes.json();
        const matsData = await matsRes.json();
        setServices(servData.data || []);
        setSpecialists(specData.data || []);
        setMedications(medsData.data || []);
        setMaterials(matsData.data || []);
      } catch (error) {
        console.error('Error fetching home care data:', error);
      } finally {
        setIsLoadingHomeCare(false);
      }
    };
    fetchData();
  }, []);

  const addInventoryItem = (item: any, type: 'medication' | 'material') => {
    if (selectedInvItems.some(i => i.id === item.id)) return;
    setSelectedInvItems(prev => [...prev, {
      id: item.id,
      type,
      name: item.name,
      quantity: 1,
      stock: item.quantity // stock disponible en clinica
    }]);
    setInventorySearch('');
    // No cerramos el dropdown para permitir seleccionar más ítems rápidamente
  };

  const updateInvQuantity = (id: string, qty: number) => {
    setSelectedInvItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, qty) } : item
    ));
  };

  const removeInvItem = (id: string) => {
    setSelectedInvItems(prev => prev.filter(item => item.id !== id));
  };

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
    watch,
  } = useForm({
    resolver: zodResolver(adminPatientSchema),
    defaultValues: {
      isActive: true,
      serviceId: '',
      careDate: new Date().toISOString().split('T')[0],
      specialistIds: []
    }
  });

  const onSubmit = async (data: AdminPatientFormValues) => {
    setIsSubmitting(true);
    setErrorMsg('');

    // Unir arreglos en formato string para que hagan match con el esquema y bd
    data.allergies = allergiesList.filter(s => s.trim() !== '').join(', ');
    data.currentMedications = medicationsList.filter(s => s.trim() !== '').join(', ');
    data.medicalHistory = historyList.filter(s => s.trim() !== '').join('\n\n');

    // Home Care Fields
    data.serviceId = selectedService;
    data.specialistIds = selectedSpecialists;
    data.inventoryItems = selectedInvItems.map(i => ({
      id: i.id,
      type: i.type,
      name: i.name,
      quantity: i.quantity
    }));

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
                
                <div className="grid grid-cols-1 gap-y-6">
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

                <div className="grid grid-cols-1 gap-y-6">
                    <div className="col-span-1">
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

          {/* Seccion 4: Plan de Atencion (Home Care) */}
          <div className="space-y-6 pt-10 border-t border-slate-100">
             <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-black">4</div>
                Plan de Atención Domiciliaria (Opcional)
             </h3>
             <p className="text-slate-500 text-sm italic">Configura el primer servicio y el equipo de trabajo para este paciente de forma inmediata.</p>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Servicio */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 h-5">
                    <Activity className="w-4 h-4 text-teal-600" /> Servicio a Prestar
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Buscar servicio..."
                      value={searchService}
                      onChange={(e) => {
                        setSearchService(e.target.value);
                        setShowServDropdown(true);
                        if (e.target.value === '') setSelectedService('');
                      }}
                      onFocus={() => setShowServDropdown(true)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 outline-none focus:ring-4 focus:ring-teal-100 text-sm transition-all h-[48px]"
                    />
                    {showServDropdown && services.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        {services.filter(s => s.name.toLowerCase().includes(searchService.toLowerCase())).map((s) => (
                          <div 
                            key={s.id} 
                            onClick={() => {
                              setSelectedService(s.id);
                              setSearchService(s.name);
                              setShowServDropdown(false);
                            }}
                            className={cn(
                              "px-4 py-3 cursor-pointer transition-colors flex items-center justify-between",
                              selectedService === s.id ? "bg-teal-50 text-teal-700 font-bold" : "hover:bg-slate-50 text-slate-600"
                            )}
                          >
                            <span className="text-sm">{s.name}</span>
                            {selectedService === s.id && <Check size={16} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fecha */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 h-5">
                    <CalendarIcon className="w-4 h-4 text-teal-600" /> Fecha de Atención
                  </label>
                  <input 
                    type="date"
                    {...register('careDate')}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 outline-none focus:ring-4 focus:ring-teal-100 text-sm border-slate-200 text-slate-600 h-[48px]"
                  />
                </div>

                {/* Especialistas Team */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 h-5">
                    <UserPlus className="w-4 h-4 text-teal-600" /> Equipo de Especialistas
                  </label>
                  <div className="relative group">
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Buscar médico, enfermera..."
                        value={searchSpecialist}
                        onChange={(e) => {
                          setSearchSpecialist(e.target.value);
                          setShowSpecDropdown(true);
                        }}
                        onFocus={() => setShowSpecDropdown(true)}
                        className="w-full rounded-xl border border-slate-200 px-10 py-3 bg-slate-50 outline-none focus:ring-4 focus:ring-teal-100 text-sm transition-all h-[48px]"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    </div>
                    {showSpecDropdown && specialists.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        {specialists.filter(s => 
                          `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchSpecialist.toLowerCase())
                        ).map((s) => (
                          <div 
                            key={s.id} 
                            onClick={() => {
                              if (!selectedSpecialists.includes(s.id)) {
                                setSelectedSpecialists(prev => [...prev, s.id]);
                              } else {
                                setSelectedSpecialists(prev => prev.filter(i => i !== s.id));
                              }
                              setSearchSpecialist('');
                            }}
                            className={cn(
                              "px-4 py-3 cursor-pointer transition-colors flex items-center justify-between border-b border-slate-50 last:border-0",
                              selectedSpecialists.includes(s.id) ? "bg-teal-50 text-teal-700 font-bold" : "hover:bg-slate-50"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">{s.first_name} {s.last_name}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{s.role}</span>
                            </div>
                            {selectedSpecialists.includes(s.id) && <Check size={16} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Tags positioned BELOW the input */}
                  <div className="flex flex-wrap gap-2 mt-2 min-h-[24px]">
                    {selectedSpecialists.map((id) => {
                      const spec = specialists.find(s => s.id === id);
                      return (
                        <div key={id} className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 animate-in zoom-in-50">
                          {spec?.first_name} {spec?.last_name}
                          <button type="button" onClick={() => setSelectedSpecialists(prev => prev.filter(i => i !== id))} className="hover:text-teal-900 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
             </div>
          </div>

          {/* Seccion 5: Insumos y Materiales (Home Care Inventory) */}
          <div className="space-y-6 pt-10 border-t border-slate-100">
             <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black">5</div>
                Insumos y Materiales p/ Domicilio (Opcional)
             </h3>
             <p className="text-slate-500 text-sm italic">Define qué materiales se trasladarán al domicilio del paciente para su atención.</p>

             <div className="space-y-4">
                {/* Buscador de Inventario */}
                <div className="max-w-md relative">
                   <div className="relative">
                      <input 
                        type="text"
                        placeholder="Buscar medicamento o material..."
                        value={inventorySearch}
                        onChange={(e) => {
                          setInventorySearch(e.target.value);
                          setShowInvDropdown(true);
                        }}
                        onFocus={() => setShowInvDropdown(true)}
                        className="w-full rounded-xl border border-slate-200 px-10 py-3 bg-slate-50 outline-none focus:ring-4 focus:ring-blue-100 text-sm transition-all h-[48px]"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                   </div>

                   {showInvDropdown && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        {/* Medicamentos */}
                        <div className="px-4 py-2 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Medicamentos</div>
                        {medications.filter(m => m.name.toLowerCase().includes(inventorySearch.toLowerCase())).map(m => (
                          <div key={m.id} onClick={() => addInventoryItem(m, 'medication')} className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between border-b border-slate-50 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Pill size={14} /></div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-700">{m.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-black">{m.dosage || 'S/D'} - {m.presentation || 'S/P'}</span>
                              </div>
                            </div>
                            <div className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded text-slate-500">STOCK: {m.quantity}</div>
                          </div>
                        ))}

                        {/* Materiales */}
                        <div className="px-4 py-2 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mt-2">Materiales Médicos</div>
                        {materials.filter(m => m.name.toLowerCase().includes(inventorySearch.toLowerCase())).map(m => (
                          <div key={m.id} onClick={() => addInventoryItem(m, 'material')} className="px-4 py-3 hover:bg-teal-50 cursor-pointer transition-colors flex items-center justify-between border-b border-slate-50 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-teal-100 text-teal-600 rounded-lg"><Package size={14} /></div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-700">{m.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-black">{m.specifications || 'Sin especificaciones'}</span>
                              </div>
                            </div>
                            <div className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded text-slate-500">STOCK: {m.quantity}</div>
                          </div>
                        ))}

                        {medications.length === 0 && materials.length === 0 && (
                          <div className="px-4 py-8 text-center text-slate-400 text-sm">No hay productos en inventario</div>
                        )}
                      </div>
                   )}
                </div>

                {/* Lista de Items Seleccionados */}
                {selectedInvItems.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 animate-in fade-in slide-in-from-bottom-4">
                    {selectedInvItems.map((item) => (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 group hover:border-blue-300 hover:shadow-lg transition-all">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                          item.type === 'medication' ? "bg-blue-50 text-blue-600" : "bg-teal-50 text-teal-600"
                        )}>
                          {item.type === 'medication' ? <Pill size={20} /> : <Layers size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 truncate">{item.name}</h4>
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{item.type === 'medication' ? 'Medicamento' : 'Insumo'}</span>
                          
                          <div className="mt-2 flex items-center gap-3">
                             <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200">
                                <button 
                                  type="button" 
                                  onClick={() => updateInvQuantity(item.id, item.quantity - 1)}
                                  className="px-2 py-1 text-slate-400 hover:text-blue-600 transition-colors"
                                >-</button>
                                <input 
                                  type="number" 
                                  value={item.quantity}
                                  onChange={(e) => updateInvQuantity(item.id, parseInt(e.target.value))}
                                  className="w-10 bg-transparent text-center text-xs font-black text-slate-700 outline-none"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => updateInvQuantity(item.id, item.quantity + 1)}
                                  className="px-2 py-1 text-slate-400 hover:text-blue-600 transition-colors"
                                >+</button>
                             </div>
                             <span className="text-[9px] font-black text-slate-300 italic">Disponibles: {item.stock}</span>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeInvItem(item.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
