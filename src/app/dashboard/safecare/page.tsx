'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  FileUp, 
  Clock, 
  User, 
  MapPin, 
  Phone,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getAllSafecareRequests, updateSafecareStatus, uploadSafecareDocument } from '@/lib/actions/safecare';
import { SafecareRequest } from '@/types/safecare';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

// Lista de AuthIDs autorizados para SafeCare
const AUTHORIZED_AUTH_IDS = [
  '8c9c8cbd-fa15-4f6c-8673-ddf80d1efc91', // Katherine Correa
  'ef34afcf-4653-4706-931c-1ebcc1b76c8d', // Karina González
  'b8e3cda7-e548-4b5b-aba6-5236595e723e'  // Diana Baptista
];

export default function SafecareStaffPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<SafecareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'requested' | 'attended'>('all');
  const [selectedRequest, setSelectedRequest] = useState<SafecareRequest | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/safecare/login');
        return;
      }

      // Verificar por ID específico o por Rol
      const { data: appUser } = await supabase
        .from('users')
        .select('role')
        .eq('authId', user.id)
        .single();

      const hasAuthorizedRole = appUser && ['ADMIN', 'ADMINISTRACION', 'SAFECARE'].includes(appUser.role);
      const isAuthorizedId = AUTHORIZED_AUTH_IDS.includes(user.id);

      if (!hasAuthorizedRole && !isAuthorizedId) {
        router.push('/dashboard');
        return;
      }
      
      setIsAuthorized(true);
      loadRequests();
    }
    checkAuth();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const data = await getAllSafecareRequests();
    setRequests(data);
    setLoading(false);
  };

  const handleStatusUpdate = async (id: string, status: 'contacted' | 'attended') => {
    const res = await updateSafecareStatus(id, status);
    if (res.success) loadRequests();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRequest || !e.target.files?.[0]) return;
    setUploading(true);
    
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await uploadSafecareDocument(selectedRequest.id, selectedRequest.patient_id, {
        name: file.name,
        type: 'medical_report',
        url: base64 // En un caso real esto se subiría a storage y usaría la URL
      });
      
      if (res.success) {
        setSelectedRequest(null);
        loadRequests();
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const filteredRequests = requests.filter(req => {
    const requesterName = `${(req as any).patient?.firstName || ''} ${(req as any).patient?.lastName || ''}`.toLowerCase();
    const beneficiaryName = `${(req as any).beneficiary?.firstName || ''} ${(req as any).beneficiary?.lastName || ''}`.toLowerCase();
    const matchesSearch = 
      requesterName.includes(search.toLowerCase()) || 
      beneficiaryName.includes(search.toLowerCase()) || 
      req.patient_address.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || req.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading || !isAuthorized) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-slate-500">Verificando credenciales SafeCare...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SafeCare Admin Panel</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Gestión de Solicitudes Domiciliarias</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Hoy</p>
              <p className="text-xl font-black text-indigo-600">{requests.length}</p>
            </div>
            <div className="h-8 w-px bg-slate-100" />
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Pendientes</p>
              <p className="text-xl font-black text-amber-500">{requests.filter(r => r.status === 'requested').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por paciente, familiar o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            Todas
          </button>
          <button 
            onClick={() => setFilter('requested')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'requested' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            Nuevas
          </button>
          <button 
            onClick={() => setFilter('attended')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'attended' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            Atendidas
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white h-64 rounded-3xl border border-slate-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredRequests.map((req: any) => (
              <motion.div 
                key={req.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group"
              >
                <div className="p-6 space-y-4 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        {(req.beneficiary || req.patient)?.firstName?.[0] || 'P'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 leading-tight">
                          {req.beneficiary ? `${req.beneficiary.firstName} ${req.beneficiary.lastName}` : `${req.patient?.firstName} ${req.patient?.lastName}`}
                        </h4>
                        {req.beneficiary && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                            Solicitado por: {req.patient?.firstName} {req.patient?.lastName}
                          </p>
                        )}
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{req.plan_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      req.status === 'requested' ? 'bg-amber-100 text-amber-700' :
                      req.status === 'attended' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-indigo-100 text-indigo-700'
                    }`}>
                      {req.status}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="leading-tight">{req.patient_address} ({req.patient_zone.replace('_', ' ')})</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Prefiere: {req.preferred_datetime ? new Date(req.preferred_datetime).toLocaleString() : 'Lo antes posible'}</span>
                    </div>
                    {req.patient_notes && (
                      <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>"{req.patient_notes}"</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  {req.status === 'requested' ? (
                    <button 
                      onClick={() => handleStatusUpdate(req.id, 'contacted')}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100"
                    >
                      Marcar Contactado
                    </button>
                  ) : req.status === 'contacted' ? (
                    <button 
                      onClick={() => setSelectedRequest(req)}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                    >
                      <FileUp className="w-4 h-4" />
                      Subir Informe
                    </button>
                  ) : (
                    <div className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Atendida Completamente
                    </div>
                  )}
                  <button className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRequests.length === 0 && (
        <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-200 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-10 h-10 text-slate-300" />
          </div>
          <div className="max-w-xs mx-auto">
            <h3 className="text-xl font-bold text-slate-900">No hay solicitudes</h3>
            <p className="text-sm text-slate-500">No encontramos solicitudes que coincidan con tu búsqueda o filtros actuales.</p>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setSelectedRequest(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-8 sm:p-12 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileUp className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Subir Informe Médico</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Para el paciente <span className="text-indigo-600 font-bold">
                    {(selectedRequest as any).patient?.firstName} {(selectedRequest as any).patient?.lastName}
                  </span>. 
                  Esto cerrará la solicitud y otorgará los Pulsos correspondientes.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block group cursor-pointer">
                  <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center group-hover:border-indigo-400 group-hover:bg-indigo-50/30 transition-all">
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileUpload}
                      accept=".pdf,.jpg,.png"
                      disabled={uploading}
                    />
                    <FileUp className="w-10 h-10 text-slate-300 mx-auto mb-4 group-hover:text-indigo-500 group-hover:scale-110 transition-all" />
                    <p className="text-sm font-bold text-slate-400 group-hover:text-indigo-600">
                      {uploading ? 'Subiendo informe...' : 'Click para seleccionar archivo'}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-2 uppercase tracking-widest font-black">PDF, PNG o JPG (Max 5MB)</p>
                  </div>
                </label>
                
                <button 
                  onClick={() => setSelectedRequest(null)}
                  disabled={uploading}
                  className="w-full py-4 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancelar Operación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
