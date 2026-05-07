'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  Send,
  Stethoscope,
  FlaskConical,
  Zap,
  Info,
  Calendar,
  FileText,
  Plus,
  History,
  AlertCircle,
  PhoneCall,
  User,
  Users as UsersIcon,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSafecareRequest, getPatientSafecareRequests } from '@/lib/actions/safecare';
import { getPatientFamily } from '@/lib/actions/family';
import { SafecarePlanType, SafecareZone, SafecareRequest } from '@/types/safecare';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

export default function SafecarePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [currentPatient, setCurrentPatient] = useState<{id: string, name: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SafecarePlanType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ id: string, whatsappUrl: string } | null>(null);

  // Form State
  const [beneficiaryId, setBeneficiaryId] = useState<string>('');
  const [zone, setZone] = useState<SafecareZone>('caracas');
  const [address, setAddress] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
        
        // 1. Get user record to find patientProfileId
        const { data: userData } = await supabase
          .from('users')
          .select('patientProfileId')
          .eq('authId', data.user.id)
          .single();
        
        if (userData?.patientProfileId) {
          // 2. Get patient profile
          const { data: pData } = await supabase
            .from('patient')
            .select('id, firstName, lastName')
            .eq('id', userData.patientProfileId)
            .single();
          
          if (pData) {
            const patientInfo = { id: pData.id, name: `${pData.firstName} ${pData.lastName || ''}`.trim() };
            setCurrentPatient(patientInfo);
            setBeneficiaryId(pData.id); // Default to self

            // 3. Get family members and filter out current patient
            const family = await getPatientFamily(pData.id);
            const filteredFamily = family.filter(m => m.id !== pData.id);
            setFamilyMembers(filteredFamily);
          }
        }

        // 4. Get requests
        if (userData?.patientProfileId) {
          const userRequests = await getPatientSafecareRequests(userData.patientProfileId);
          setRequests(userRequests);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  const handleOpenModal = (plan: SafecarePlanType) => {
    setSelectedPlan(plan);
    setShowModal(true);
    setSuccessData(null);
    setError(null);
  };

  const handleEmergencyWhatsApp = () => {
    const whatsappNumber = process.env.NEXT_PUBLIC_SAFECARE_WHATSAPP || '584121234567';
    const patientName = currentPatient?.name || 'Paciente';
    const message = encodeURIComponent(
      `EMERGENCIA, mi nombre es ${patientName}, vengo de ASHIRA, estoy presentando: `
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const handleSubmit = async () => {
    if (!userId || !selectedPlan || !address || !currentPatient) {
      setError('Por favor, completa la dirección de atención.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const beneficiary = familyMembers.find(m => m.id === beneficiaryId) || currentPatient;

      const res = await createSafecareRequest(currentPatient.id, selectedPlan, {
        zone,
        address,
        preferredDatetime: dateTime,
        notes,
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.name,
        servicesSelected: selectedPlan === 'atencion_puntual' 
          ? ['Consultas médicas domiciliarias', 'Toma de muestras de laboratorio (básicos)', 'Estudios de imagenología (Rx y ecos simples)'] 
          : ['Consulta médica de evaluación', 'Exámenes de laboratorio previos', 'Primer cóctel de sueroterapia personalizado']
      });

      if (res.success && res.request && res.whatsappUrl) {
        setSuccessData({ id: res.request.id, whatsappUrl: res.whatsappUrl });
        const updated = await getPatientSafecareRequests(currentPatient.id);
        setRequests(updated);
      } else {
        setError(res.error || 'Ocurrió un error al procesar tu solicitud. Verifica tu conexión e intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Error crítico de conexión. Por favor, intenta más tarde.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-slate-500 animate-pulse">Sincronizando con SafeCare 24/7...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      
      {/* Header & Hero */}
      <div className="flex flex-col lg:flex-row gap-12 items-center">
        <div className="flex-1 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest">Alianza Estratégica SafeCare</span>
            </div>
            <button 
              onClick={handleEmergencyWhatsApp}
              className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full hover:bg-red-100 transition-colors group"
            >
              <PhoneCall className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-black text-red-700 uppercase tracking-widest">Presione en caso de emergencia</span>
            </button>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            Hospitalización y Cuidados <br />
            <span className="text-indigo-600">en la comodidad de tu hogar.</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
            SafeCare 24/7 extiende la excelencia clínica de ASHIRA hasta tu domicilio. Accede a especialistas y tecnología médica de vanguardia sin salir de casa.
          </p>
          <div className="flex flex-wrap gap-6 pt-4">
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-semibold">Respuesta inmediata</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-semibold">Equipos portátiles de alto nivel</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-semibold">Historial médico unificado</span>
            </div>
          </div>
        </div>
        
        <div className="w-full lg:w-[400px]">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Estado del Servicio</span>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[10px] font-bold">OPERATIVO 24/7</span>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-slate-400 font-medium">Cobertura certificada en:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Caracas', 'Altos Mirandinos', 'Guarenas', 'Guatire'].map(z => (
                    <div key={z} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-center">
                      {z}
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleEmergencyWhatsApp}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-900/40 flex items-center justify-center gap-3"
              >
                <AlertTriangle className="w-4 h-4" />
                Atención de Emergencia
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Section */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Planes de Atención</h2>
            <p className="text-slate-500 text-sm">Selecciona la modalidad que mejor se adapte a tu necesidad médica</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Plan 1 */}
          <div className="group relative bg-white rounded-3xl border border-slate-200 p-8 hover:border-indigo-600 transition-all shadow-sm hover:shadow-xl flex flex-col">
            <div className="absolute top-0 right-0 p-1">
              <div className="bg-indigo-600 text-white px-4 py-2 rounded-tr-2xl rounded-bl-2xl font-black text-sm tracking-tighter shadow-lg">
                10% OFF EXCLUSIVO
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                <Stethoscope className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Atención Puntual</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Ideal para quienes requieren soluciones rápidas y efectivas sin salir de su hogar.</p>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 italic">Beneficio ASHIRA Salud+</p>
                <p className="text-xs text-indigo-900 font-bold leading-tight">
                  Ahorra un 10% en este servicio <span className="text-indigo-600 underline">solo solicitándolo</span> a través de este portal.
                </p>
              </div>

              <ul className="space-y-3 pt-2">
                {['Consultas médicas domiciliarias', 'Toma de muestras (básicos)', 'Imagenología (Rx y ecos simples)'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <button 
              onClick={() => handleOpenModal('atencion_puntual')}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all mt-8"
            >
              Solicitar Evaluación
            </button>
          </div>

          {/* Plan 2 */}
          <div className="group relative bg-white rounded-3xl border border-slate-200 p-8 hover:border-emerald-600 transition-all shadow-sm hover:shadow-xl flex flex-col">
            <div className="absolute top-0 right-0 p-1">
              <div className="bg-emerald-600 text-white px-4 py-2 rounded-tr-2xl rounded-bl-2xl font-black text-sm tracking-tighter shadow-lg">
                15% OFF EXCLUSIVO
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                <Zap className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2 text-balance leading-tight">Revitalización y Bienestar (Sueroterapia)</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Un servicio especializado diseñado para la recuperación integral del paciente. Aplica al paquete inicial:</p>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">Beneficio ASHIRA Salud+</p>
                <p className="text-xs text-emerald-900 font-bold leading-tight">
                  Ahorra un 15% en este servicio <span className="text-emerald-600 underline">solo solicitándolo</span> a través de este portal.
                </p>
              </div>

              <ul className="space-y-3 pt-2">
                {['Consulta médica de evaluación', 'Exámenes de laboratorio previos', 'Primer cóctel de sueroterapia'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <button 
              onClick={() => handleOpenModal('revitalizacion_bienestar')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all mt-8 shadow-lg shadow-emerald-100"
            >
              Solicitar Plan
            </button>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
          <History className="w-6 h-6 text-slate-400" />
          <h3 className="text-xl font-bold text-slate-900">Historial de Solicitudes</h3>
        </div>

        <div className="overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-sm">
          {requests.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {requests.map((req) => (
                <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      req.status === 'attended' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 capitalize tracking-tight">{req.plan_type.replace('_', ' ')}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1 font-bold text-slate-700"><User className="w-3 h-3" /> {req.service_details?.beneficiaryName || 'Paciente'}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(req.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.patient_zone.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      req.status === 'attended' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      req.status === 'requested' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                      req.status === 'contacted' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {req.status === 'requested' ? 'Solicitud Enviada' : req.status === 'attended' ? 'Servicio Finalizado' : req.status === 'contacted' ? 'En Contacto' : 'En Gestión'}
                    </div>
                    {req.documents?.length > 0 && (
                      <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all">
                        <FileText className="w-4 h-4" />
                        Ver Informes
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <History className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-slate-400 font-medium italic">No se registran solicitudes previas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal / Overlay Form */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowModal(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {!successData ? (
                <div className="p-8 sm:p-10 space-y-8 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Formulario de Solicitud</h3>
                      <p className="text-sm text-slate-500 mt-1 font-medium">SafeCare 24/7 • Atención Personalizada</p>
                    </div>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                    >
                      <Plus className="w-6 h-6 rotate-45" />
                    </button>
                  </div>

                  {/* Beneficiary Selector */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">¿Para quién es el servicio?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button 
                        onClick={() => setBeneficiaryId(currentPatient?.id || '')}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                          beneficiaryId === currentPatient?.id 
                          ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' 
                          : 'bg-white border-slate-100 hover:border-indigo-100'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${beneficiaryId === currentPatient?.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-slate-900">Para mi</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{currentPatient?.name}</p>
                        </div>
                      </button>

                      {familyMembers.map((member) => (
                        <button 
                          key={member.id}
                          onClick={() => setBeneficiaryId(member.id)}
                          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                            beneficiaryId === member.id 
                            ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' 
                            : 'bg-white border-slate-100 hover:border-indigo-100'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${beneficiaryId === member.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <UsersIcon className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black text-slate-900">Familiar</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{member.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ubicación de Atención</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            value={zone}
                            onChange={(e) => setZone(e.target.value as SafecareZone)}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 appearance-none"
                          >
                            <option value="caracas">Caracas</option>
                            <option value="altos_mirandinos">Altos Mirandinos</option>
                            <option value="guarenas_guatire">Guarenas - Guatire</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dirección Detallada</label>
                        <textarea 
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Urbanización, edificio, piso..."
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 h-28 resize-none leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Programación (Opcional)</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="datetime-local"
                            value={dateTime}
                            onChange={(e) => setDateTime(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notas / Sintomatología</label>
                        <textarea 
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Breve descripción del motivo de consulta..."
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 h-28 resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                      Al generar la solicitud, un especialista de <strong>SafeCare</strong> se pondrá en contacto con el paciente para brindar más información y aclarar dudas antes de la atención clínica.
                    </p>
                  </div>
                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 overflow-hidden"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-900 font-bold leading-relaxed">
                          {error}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-100">
                    <div className="flex items-start gap-3 max-w-xs">
                      <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-slate-400 font-medium leading-relaxed uppercase tracking-wider">
                        Autorizas el contacto de SafeCare 24/7 y la aplicación de descuentos ASHIRA Salud+.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button 
                        type="button"
                        onClick={handleEmergencyWhatsApp}
                        className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        Emergencia
                      </button>
                      <button 
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !address}
                        className="flex-1 md:flex-none px-12 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                      >
                        {submitting ? 'Enviando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 sm:p-20 text-center space-y-10">
                  <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">¡Solicitud Exitosa!</h3>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">ID de Registro: {successData.id}</p>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
                    Tu requerimiento ha sido procesado. Para agilizar la atención, por favor envía el mensaje pre-configurado a nuestro equipo de guardia.
                  </p>
                  <div className="flex flex-col gap-4 max-w-xs mx-auto pt-4">
                    <button 
                      onClick={() => window.open(successData.whatsappUrl, '_blank')}
                      className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
                    >
                      <Send className="w-5 h-5" />
                      Contactar por WhatsApp
                    </button>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="w-full py-5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-slate-200"
                    >
                      Finalizar y Volver
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
