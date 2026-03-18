'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Calendar, 
  FileText, 
  Activity, 
  Stethoscope, 
  Plus, 
  ShieldAlert,
  Lock,
  HeartPulse,
  Info
} from 'lucide-react';
import { formatDateDisplay } from '@/lib/format';
import { cn } from '@/lib/utils';

// Seguridad: Bloqueo de teclado y clic derecho
const SecurityWrapper = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquear Ctrl+C, Ctrl+P, Ctrl+S, Ctrl+U, F12, PrintScreen
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'p' || e.key === 's' || e.key === 'u')) ||
        e.key === 'F12' || e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        alert('Acción no permitida por seguridad del paciente.');
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div 
      className="select-none" 
      style={{ 
        userSelect: 'none', 
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none' // Bloquea el menú de "Guardar Imagen" en iOS
      }}
    >
      {children}
    </div>
  );
};

export default function SharedHistoryPage({ params }: { params: Promise<{ token: string }> }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSharedData() {
      try {
        const resolvedParams = await params;
        const res = await fetch(`/api/share/history/${resolvedParams.token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Enlace no válido');
        }
        const result = await res.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSharedData();
  }, [params]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Validando acceso seguro...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center shadow-xl shadow-red-500/10">
           <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900">Enlace No Válido</h1>
        <p className="text-slate-500 max-w-md font-medium text-lg">
          Este acceso ha expirado por seguridad o el enlace es incorrecto. Por favor, solicita uno nuevo a la administración.
        </p>
        <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold">Reintentar</button>
      </div>
    );
  }

  const { patient, consultations, documents, nursingNotes } = data;
  const allRecords = [
    ...consultations.map((c: any) => ({ type: 'CONSULTATION', date: c.consultation_date, title: 'Consulta Médica', subtitle: `Dr. ${c.specialist?.last_name}`, content: c.diagnosis })),
    ...documents.map((d: any) => ({ type: 'DOCUMENT', date: d.uploaded_at, title: d.file_name, subtitle: d.category || 'Laboratorio' })),
    ...nursingNotes.map((n: any) => ({ type: 'NURSING_NOTE', date: n.created_at, title: 'Nota de Enfermería', subtitle: 'Evolución Clínica', content: n.content }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <SecurityWrapper>
      <style>{`
        @media print {
          body { display: none !important; }
        }
        * {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">
        
        {/* Marca de agua dinámica */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] flex flex-wrap gap-20 p-20 rotate-[-25deg] z-0 overflow-hidden select-none">
            {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="text-4xl font-black whitespace-nowrap uppercase tracking-widest text-blue-600">
                    ASHIRA CLINIC - {patient.identifier} - CONFIDENCIAL
                </span>
            ))}
        </div>

        <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
          
          {/* Header */}
          <header className="bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/50 border border-white mb-10 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-teal-500 to-indigo-500" />
             <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black mx-auto mb-6 shadow-2xl shadow-blue-600/20">
                {patient.first_name[0]}{patient.last_name[0]}
             </div>
             <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                Historial Clínico
             </h1>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                <Lock className="w-3 h-3" /> Acceso Protegido - {patient.first_name} {patient.last_name}
             </p>
          </header>

          <div className="bg-blue-600 rounded-3xl p-6 mb-10 text-white flex items-center gap-6 shadow-xl shadow-blue-600/20">
             <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <HeartPulse className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Identificación</p>
                <p className="text-2xl font-black tracking-tight">{patient.identifier}</p>
             </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
             {allRecords.length === 0 ? (
               <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 italic text-slate-400">
                  No hay registros compartidos en este momento.
               </div>
             ) : (
               allRecords.map((record, i) => (
                 <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-start gap-5 hover:border-blue-200 transition-colors group">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                      record.type === 'CONSULTATION' ? "bg-blue-50 text-blue-600" : 
                      record.type === 'DOCUMENT' ? "bg-teal-50 text-teal-600" : "bg-purple-50 text-purple-600"
                    )}>
                       {record.type === 'CONSULTATION' && <Stethoscope className="w-6 h-6" />}
                       {record.type === 'DOCUMENT' && <FileText className="w-6 h-6" />}
                       {record.type === 'NURSING_NOTE' && <Activity className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 space-y-2">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             {new Date(record.date).toLocaleDateString()}
                          </span>
                       </div>
                       <h4 className="text-lg font-black text-slate-900">
                          {record.title}
                       </h4>
                       <p className="text-sm font-bold text-slate-500 uppercase tracking-tighter">{record.subtitle}</p>
                       {record.content && (
                         <div className="bg-slate-50 rounded-2xl p-4 text-xs font-medium text-slate-600 leading-relaxed border border-slate-100">
                            {record.content}
                         </div>
                       )}
                    </div>
                 </div>
               ))
             )}
          </div>

          <footer className="mt-20 text-center pb-12">
             <div className="bg-slate-200/50 h-px w-20 mx-auto mb-8" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ashira Health System © 2026</p>
             <div className="flex items-center justify-center gap-6 text-slate-400">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[9px] font-bold max-w-[200px] leading-tight opacity-50">
                  ESTE DOCUMENTO ES PRIVADO Y SOLO PARA USO INFORMATIVO FAMILIAR. LA COPIA ES ILEGAL.
                </span>
             </div>
          </footer>

        </div>
      </div>
    </SecurityWrapper>
  );
}
