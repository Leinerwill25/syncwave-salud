'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { unregisteredPatientSchema, UnregisteredPatientFormValues } from '@/lib/schemas/unregisteredPatientSchema';
import { User, Phone, MapPin, Activity, Save, ArrowLeft, Loader2, AlertCircle, Plus, Trash2, Heart } from 'lucide-react';
import Link from 'next/link';

interface DynamicListInputProps {
    label: string;
    field: 'allergies' | 'chronicConditions' | 'currentMedication' | 'familyHistory';
    placeholder: string;
    values: string[];
    handleDynamicInput: (field: 'allergies' | 'chronicConditions' | 'currentMedication' | 'familyHistory', index: number, value: string) => void;
    handleKeyDown: (e: React.KeyboardEvent, field: 'allergies' | 'chronicConditions' | 'currentMedication' | 'familyHistory', index: number) => void;
    removeDynamicInput: (field: 'allergies' | 'chronicConditions' | 'currentMedication' | 'familyHistory', index: number) => void;
    addDynamicInput: (field: 'allergies' | 'chronicConditions' | 'currentMedication' | 'familyHistory') => void;
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
                    className="flex-1 p-2 rounded-lg border border-slate-200 focus:border-rose-400 focus:ring-rose-100 focus:ring-2 bg-slate-50 outline-none transition-all text-sm"
                    placeholder={placeholder}
                    autoFocus={idx > 0 && val === ''}
                />
                <button 
                    type="button"
                    onClick={() => removeDynamicInput(field, idx)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white border border-slate-200 rounded-lg"
                >
                    <Trash2 size={16} />
                </button>
                {idx === values.length - 1 && (
                    <button 
                        type="button"
                        onClick={() => addDynamicInput(field)}
                        className="p-2 text-sky-600 hover:bg-sky-50 transition-colors bg-white border border-sky-100 rounded-lg"
                    >
                        <Plus size={16} />
                    </button>
                )}
            </div>
        ))}
    </div>
);

export default function NewUnregisteredPatientPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    
    const [formData, setFormData] = useState<Partial<UnregisteredPatientFormValues>>({
        firstName: '',
        lastName: '',
        identification: '',
        birthDate: '',
        sex: 'OTHER',
        profession: '',
        phone: '',
        email: '',
        address: '',
        motive: '',
        painScale: undefined,
        vitalBpSystolic: undefined,
        vitalBpDiastolic: undefined,
        vitalHeartRate: undefined,
        vitalRespiratoryRate: undefined,
        vitalTemperature: undefined,
        vitalSpo2: undefined,
        vitalGlucose: undefined,
        heightCm: undefined,
        weightKg: undefined,
        allergies: [''],
        chronicConditions: [''],
        currentMedication: [''],
        familyHistory: [''],
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: ''
    });

    const updateField = (field: keyof UnregisteredPatientFormValues, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (formErrors[field]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleDynamicInput = (field: 'allergies' | 'chronicConditions' | 'currentMedication' | 'familyHistory', index: number, value: string) => {
        const currentArray = [...(formData[field] || [''])];
        currentArray[index] = value;
        updateField(field, currentArray);
    };

    const addDynamicInput = (field: 'allergies' | 'chronicConditions' | 'currentMedication' | 'familyHistory') => {
        const currentArray = [...(formData[field] || [''])];
        updateField(field, [...currentArray, '']);
    };

    const removeDynamicInput = (field: 'allergies' | 'chronicConditions' | 'currentMedication' | 'familyHistory', index: number) => {
        const currentArray = [...(formData[field] || [''])];
        if (currentArray.length > 1) {
            updateField(field, currentArray.filter((_, i) => i !== index));
        } else {
            updateField(field, ['']);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, field: 'allergies' | 'chronicConditions' | 'currentMedication' | 'familyHistory', index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addDynamicInput(field);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFormErrors({});
        setLoading(true);

        try {
            const cleanedData = {
                ...formData,
                allergies: formData.allergies?.filter(s => s.trim() !== ''),
                chronicConditions: formData.chronicConditions?.filter(s => s.trim() !== ''),
                currentMedication: formData.currentMedication?.filter(s => s.trim() !== ''),
                familyHistory: formData.familyHistory?.filter(s => s.trim() !== ''),
            };

            const validationResult = unregisteredPatientSchema.safeParse(cleanedData);
            
            if (!validationResult.success) {
                const errors: Record<string, string> = {};
                validationResult.error.issues.forEach(issue => {
                    const path = issue.path[0]?.toString();
                    if (path) {
                        errors[path] = issue.message;
                    }
                });
                setFormErrors(errors);
                setError('Por favor corrige los errores en el formulario antes de continuar.');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/clinic/patients/unregistered', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validationResult.data),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al guardar el paciente');
            }

            router.push('/dashboard/clinic/patients');
            router.refresh();
            
        } catch (err: any) {
            console.error('Submit error:', err);
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                <Link 
                    href="/dashboard/clinic/patients"
                    className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Nuevo Paciente Manual</h1>
                    <p className="text-slate-500 mt-1">Registrar un paciente no afiliado previamente al sistema.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* DATOS PERSONALES */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="bg-sky-100 p-2 rounded-lg text-sky-600">
                            <User className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Datos Personales</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombres *</label>
                            <input 
                                type="text"
                                value={formData.firstName}
                                onChange={e => updateField('firstName', e.target.value)}
                                className={`w-full p-3 rounded-xl border ${formErrors.firstName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:border-sky-500 focus:ring-sky-200'} bg-slate-50 outline-none focus:ring-2 transition-all`}
                                placeholder="Ej. Juan Carlos"
                            />
                            {formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Apellidos *</label>
                            <input 
                                type="text"
                                value={formData.lastName}
                                onChange={e => updateField('lastName', e.target.value)}
                                className={`w-full p-3 rounded-xl border ${formErrors.lastName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:border-sky-500 focus:ring-sky-200'} bg-slate-50 outline-none focus:ring-2 transition-all`}
                                placeholder="Ej. Pérez Gómez"
                            />
                            {formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Documento / Cédula</label>
                            <input 
                                type="text"
                                value={formData.identification || ''}
                                onChange={e => updateField('identification', e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-sky-200 focus:ring-2 bg-slate-50 outline-none transition-all"
                                placeholder="V-12345678"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha de Nacimiento</label>
                            <input 
                                type="date"
                                value={formData.birthDate || ''}
                                onChange={e => updateField('birthDate', e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-sky-200 focus:ring-2 bg-slate-50 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Sexo</label>
                            <select 
                                value={formData.sex || 'OTHER'}
                                onChange={e => updateField('sex', e.target.value as 'M' | 'F' | 'OTHER')}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-sky-200 focus:ring-2 bg-slate-50 outline-none transition-all"
                            >
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                                <option value="OTHER">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Ocupación / Profesión</label>
                            <input 
                                type="text"
                                value={formData.profession || ''}
                                onChange={e => updateField('profession', e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-sky-200 focus:ring-2 bg-slate-50 outline-none transition-all"
                                placeholder="Ej. Ingeniero"
                            />
                        </div>
                    </div>
                </div>

                {/* DATOS DE CONTACTO */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="bg-teal-100 p-2 rounded-lg text-teal-600">
                            <Phone className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Contacto</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono Principal *</label>
                            <input 
                                type="tel"
                                value={formData.phone}
                                onChange={e => updateField('phone', e.target.value)}
                                className={`w-full p-3 rounded-xl border ${formErrors.phone ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'} bg-slate-50 outline-none focus:ring-2 transition-all`}
                                placeholder="Ej. +58 414 1234567"
                            />
                            {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                            <input 
                                type="email"
                                value={formData.email || ''}
                                onChange={e => updateField('email', e.target.value)}
                                className={`w-full p-3 rounded-xl border ${formErrors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'} bg-slate-50 outline-none focus:ring-2 transition-all`}
                                placeholder="Ej. correo@ejemplo.com"
                            />
                            {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Dirección Referencial</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <input 
                                    type="text"
                                    value={formData.address || ''}
                                    onChange={e => updateField('address', e.target.value)}
                                    className="w-full p-3 pl-10 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-teal-200 focus:ring-2 bg-slate-50 outline-none transition-all"
                                    placeholder="Ingrese la dirección del paciente"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTACTO DE EMERGENCIA */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                            <Heart className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Contacto de Emergencia</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Completo</label>
                            <input 
                                type="text"
                                value={formData.emergencyContactName || ''}
                                onChange={e => updateField('emergencyContactName', e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-orange-200 focus:ring-2 bg-slate-50 outline-none transition-all"
                                placeholder="Nombre del familiar"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono</label>
                            <input 
                                type="tel"
                                value={formData.emergencyContactPhone || ''}
                                onChange={e => updateField('emergencyContactPhone', e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-orange-200 focus:ring-2 bg-slate-50 outline-none transition-all"
                                placeholder="+58..."
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Parentesco / Relación</label>
                            <input 
                                type="text"
                                value={formData.emergencyContactRelation || ''}
                                onChange={e => updateField('emergencyContactRelation', e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-orange-200 focus:ring-2 bg-slate-50 outline-none transition-all"
                                placeholder="Ej. Madre, Esposo"
                            />
                        </div>
                    </div>
                </div>

                {/* TRIAJE Y MOTIVO */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-slate-800">Motivo y Datos Clínicos Base</h2>
                            <p className="text-xs text-slate-500">Opcional para un proceso de admisión completo</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Motivo de la Visita</label>
                            <textarea 
                                value={formData.motive || ''}
                                onChange={e => updateField('motive', e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-rose-200 focus:ring-2 bg-slate-50 outline-none transition-all resize-none"
                                placeholder="Breve descripción del motivo de atención..."
                                rows={2}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Talla (cm)</label>
                            <input 
                                type="number"
                                value={formData.heightCm || ''}
                                onChange={e => updateField('heightCm', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-rose-200 focus:ring-2 bg-slate-50 outline-none transition-all"
                                placeholder="Ej. 175"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Peso (kg)</label>
                            <input 
                                type="number"
                                value={formData.weightKg || ''}
                                onChange={e => updateField('weightKg', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-rose-200 focus:ring-2 bg-slate-50 outline-none transition-all"
                                placeholder="Ej. 70"
                            />
                        </div>
                        
                        <div className="md:col-span-2 pt-6 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider">Antecedentes Médicos (Presiona Enter para añadir otro)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <DynamicListInput 
                                    label="Alergias" 
                                    field="allergies" 
                                    placeholder="Ej. Penicilina" 
                                    values={formData.allergies || ['']}
                                    handleDynamicInput={handleDynamicInput}
                                    handleKeyDown={handleKeyDown}
                                    addDynamicInput={addDynamicInput}
                                    removeDynamicInput={removeDynamicInput}
                                />
                                <DynamicListInput 
                                    label="Condiciones Crónicas" 
                                    field="chronicConditions" 
                                    placeholder="Ej. Diabetes tipo 2" 
                                    values={formData.chronicConditions || ['']}
                                    handleDynamicInput={handleDynamicInput}
                                    handleKeyDown={handleKeyDown}
                                    addDynamicInput={addDynamicInput}
                                    removeDynamicInput={removeDynamicInput}
                                />
                                <DynamicListInput 
                                    label="Medicación Actual" 
                                    field="currentMedication" 
                                    placeholder="Ej. Metformina 500mg" 
                                    values={formData.currentMedication || ['']}
                                    handleDynamicInput={handleDynamicInput}
                                    handleKeyDown={handleKeyDown}
                                    addDynamicInput={addDynamicInput}
                                    removeDynamicInput={removeDynamicInput}
                                />
                                <DynamicListInput 
                                    label="Antecedentes Familiares" 
                                    field="familyHistory" 
                                    placeholder="Ej. Hipertensión (Padre)" 
                                    values={formData.familyHistory || ['']}
                                    handleDynamicInput={handleDynamicInput}
                                    handleKeyDown={handleKeyDown}
                                    addDynamicInput={addDynamicInput}
                                    removeDynamicInput={removeDynamicInput}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activos Finales */}
                <div className="flex justify-end gap-4">
                    <button 
                        type="button" 
                        onClick={() => router.push('/dashboard/clinic/patients')}
                        className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors bg-white shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 transition-all shadow-md disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {loading ? 'Guardando...' : 'Guardar Paciente'}
                    </button>
                </div>
            </form>
        </div>
    );
}

