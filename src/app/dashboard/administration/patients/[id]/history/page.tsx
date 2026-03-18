'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  FileText, 
  Activity, 
  Stethoscope, 
  Plus, 
  Share2, 
  Clock, 
  Eye,
  ChevronRight,
  User,
  ExternalLink,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDateDisplay } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HistoryRecord {
  type: 'CONSULTATION' | 'DOCUMENT' | 'NURSING_NOTE' | 'ATTENTION';
  date: string;
  title: string;
  subtitle?: string;
  content?: string;
  metadata?: any;
}

export default function AdminPatientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [expirationHours, setExpirationHours] = useState('24');
  const [shareResult, setShareResult] = useState<{ url: string, expires_at: string } | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const resolvedParams = await params;
        const [patientRes, historyRes] = await Promise.all([
          fetch(`/api/administration/patients/${resolvedParams.id}`),
          fetch(`/api/administration/patients/${resolvedParams.id}/full-history`)
        ]);

        if (!patientRes.ok || !historyRes.ok) throw new Error('Error al cargar datos');

        const patientData = await patientRes.json();
        const historyData = await historyRes.json();
        
        setPatient(patientData);

        // Transform and combine records
        const combinedRecords: HistoryRecord[] = [
          ...historyData.consultations.map((c: any) => ({
            type: 'CONSULTATION',
            date: c.consultation_date,
            title: `Consulta: ${c.chief_complaint?.substring(0, 50) || 'Sin motivo'}`,
            subtitle: `Dr. ${c.specialist?.first_name} ${c.specialist?.last_name}`,
            content: c.diagnosis || c.treatment_plan || 'Sin detalles registrados',
            metadata: { id: c.id }
          })),
          ...historyData.documents.map((d: any) => ({
            type: 'DOCUMENT',
            date: d.uploaded_at,
            title: d.file_name,
            subtitle: d.file_type || 'Documento / Laboratorio',
            content: `Categoría: ${d.category || 'General'}`,
            metadata: { url: d.file_path }
          })),
          ...historyData.nursingNotes.map((n: any) => ({
            type: 'NURSING_NOTE',
            date: n.created_at,
            title: `Nota de Enfermería: ${n.note_type === 'evolution' ? 'Evolución' : 'Pública'}`,
            subtitle: `Enf. ${n.nurse?.full_name}`,
            content: n.content,
            metadata: { type: n.note_type }
          })),
          ...historyData.attentions.filter((a: any) => a.status === 'COMPLETADA').map((a: any) => ({
            type: 'ATTENTION',
            date: a.attention_date,
            title: a.title,
            subtitle: `Atención: ${a.specialist?.last_name || 'Especialista Externo'}`,
            content: a.description,
            metadata: { status: a.status }
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setRecords(combinedRecords);
      } catch (error) {
        console.error('Error fetching patient history:', error);
        toast.error('No se pudo cargar el historial');
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [params]);

  const handleCreateShareLink = async () => {
    if (!patient) return;
    setIsSharing(true);
    try {
      const res = await fetch('/api/share/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          isUnregistered: patient.type === 'UNREG',
          expirationHours
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShareResult({ url: data.share_url, expires_at: data.expires_at });
      toast.success('Link generado correctamente');
    } catch (err: any) {
      toast.error(`Error al generar: ${err.message}`);
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver a la Ficha
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-blue-500/20">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Historial Clínico Completo
              </h1>
              <p className="text-slate-500 font-medium">Paciente: {patient.first_name} {patient.last_name}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1 active:scale-95"
        >
          <Share2 className="w-4 h-4" /> Compartir Historial
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultas</span>
          <span className="text-2xl font-black text-slate-900">{records.filter(r => r.type === 'CONSULTATION').length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos</span>
          <span className="text-2xl font-black text-slate-900">{records.filter(r => r.type === 'DOCUMENT').length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">N. Enfermería</span>
          <span className="text-2xl font-black text-slate-900">{records.filter(r => r.type === 'NURSING_NOTE').length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eventos</span>
          <span className="text-2xl font-black text-slate-900">{records.length}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-8">
        {/* Linea vertical */}
        <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-100" />

        {records.length === 0 ? (
          <div className="bg-slate-50 rounded-3xl p-12 text-center flex flex-col items-center gap-4">
            <Info className="w-12 h-12 text-slate-300" />
            <p className="font-bold text-slate-500">No hay registros clínicos suficientes para este paciente.</p>
          </div>
        ) : (
          records.map((record, idx) => (
            <div key={idx} className="relative pl-16 group">
              {/* Icon Circle */}
              <div className={cn(
                "absolute left-0 top-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 z-10",
                record.type === 'CONSULTATION' ? "bg-blue-600 text-white shadow-blue-600/20" : 
                record.type === 'DOCUMENT' ? "bg-teal-600 text-white shadow-teal-600/20" : 
                record.type === 'NURSING_NOTE' ? "bg-purple-600 text-white shadow-purple-600/20" : 
                "bg-emerald-600 text-white shadow-emerald-600/20"
              )}>
                {record.type === 'CONSULTATION' && <Stethoscope className="w-6 h-6" />}
                {record.type === 'DOCUMENT' && <FileText className="w-6 h-6" />}
                {record.type === 'NURSING_NOTE' && <Activity className="w-6 h-6" />}
                {record.type === 'ATTENTION' && <Plus className="w-6 h-6" />}
              </div>

              {/* Content Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                        {record.type}
                      </span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(record.date).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {record.title}
                    </h3>
                    <p className="text-sm font-bold text-slate-500">{record.subtitle}</p>
                  </div>
                  {record.type === 'DOCUMENT' && (
                    <a 
                      href={record.metadata?.url} 
                      target="_blank" 
                      className="inline-flex items-center gap-2 text-xs font-black text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 transition-colors"
                    >
                      <Eye className="w-3 h-3" /> VER DOCUMENTO
                    </a>
                  )}
                </div>
                
                {record.content && (
                  <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap border border-slate-100/50">
                    {record.content}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                 <h3 className="text-2xl font-black text-slate-900">Compartir Historial</h3>
                 <p className="text-slate-500 font-medium">Genera un enlace temporal protegido.</p>
              </div>
              <button onClick={() => { setIsShareModalOpen(false); setShareResult(null); }} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {!shareResult ? (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                       <Clock className="w-4 h-4 text-blue-600" /> Tiempo de Validez
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 12, 24, 48, 72].map(hours => (
                         <button 
                           key={hours}
                           onClick={() => setExpirationHours(hours.toString())}
                           className={cn(
                             "py-3 rounded-2xl font-black text-sm border-2 transition-all",
                             expirationHours === hours.toString() 
                               ? "bg-blue-600 text-white border-blue-600" 
                               : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                           )}
                         >
                           {hours}h
                         </button>
                      ))}
                      <div className="relative">
                         <input 
                           type="number" 
                           placeholder="Ex..." 
                           className="w-full py-3 px-4 rounded-2xl border-2 border-slate-100 font-black text-sm outline-none focus:border-blue-600"
                           onChange={(e) => setExpirationHours(e.target.value)}
                         />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">HS</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-3xl flex items-start gap-4 border border-blue-100">
                     <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                        <Info className="w-5 h-5" />
                     </div>
                     <p className="text-xs font-bold text-blue-900 leading-relaxed">
                        Este enlace permitirá acceso de solo lectura. Por seguridad, se bloquearán las opciones de copiado y descarga.
                     </p>
                  </div>

                  <button 
                    onClick={handleCreateShareLink}
                    disabled={isSharing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    {isSharing ? <Loader2 className="w-6 h-6 animate-spin" /> : 'GENERAR ENLACE'}
                  </button>
                </>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-5">
                   <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[32px] text-center">
                      <div className="w-16 h-16 bg-emerald-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                         <Share2 className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-black text-emerald-900">Link Listo</h4>
                      <p className="text-xs font-bold text-emerald-700/70 mt-1 uppercase tracking-widest">
                         Expira: {new Date(shareResult.expires_at).toLocaleString()}
                      </p>
                   </div>

                   <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Enlace para familiares</label>
                       <div className="flex gap-2">
                          <input 
                            readOnly 
                            value={shareResult.url} 
                            className="flex-1 bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 outline-none" 
                          />
                          <button 
                            onClick={() => copyToClipboard(shareResult.url)}
                            className="bg-blue-600 text-white px-4 rounded-2xl hover:bg-blue-700 transition-colors"
                          >
                             Copia
                          </button>
                       </div>
                   </div>

                   <button 
                    onClick={() => { setIsShareModalOpen(false); setShareResult(null); }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-black transition-colors"
                   >
                     CERRAR
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
