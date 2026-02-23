'use client';
// src/components/nurse/clinical/PatientNotesTab.tsx
import { useState, useEffect, useCallback } from 'react';
import type { NursingEvolutionNote } from '@/types/nurse.types';
import { getEvolutionNotes, createEvolutionNote } from '@/lib/supabase/nurse.service';
import { useNurseState, useNurseActions } from '@/context/NurseContext';
import { FileText, Send, Clock, User, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  queueId: string;
}

export function PatientNotesTab({ queueId }: Props) {
  const { nurseProfile, activePatient, isOnline } = useNurseState();
  const { addToSyncQueue } = useNurseActions();
  const [notes, setNotes] = useState<NursingEvolutionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [evolutionType, setEvolutionType] = useState<NursingEvolutionNote['evolution_type']>('standard');

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvolutionNotes(queueId);
      setNotes(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar notas de evolución');
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !nurseProfile) return;

    const payload = {
      queue_id: queueId,
      nurse_id: nurseProfile.nurse_profile_id,
      patient_id: activePatient?.patient_id || undefined,
      unregistered_patient_id: activePatient?.unregistered_patient_id || undefined,
      content: content.trim(),
      evolution_type: evolutionType
    };

    setSubmitting(true);
    try {
      if (!isOnline) {
        await addToSyncQueue('note', payload);
        // Optimistic update for history
        const tempId = `temp-${Date.now()}`;
        setNotes(prev => [{
          note_id: tempId,
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: nurseProfile.nurse_profile_id
        } as NursingEvolutionNote, ...prev]);
        setContent('');
        return;
      }

      const { data, error } = await createEvolutionNote(payload);

      if (error) throw new Error(error);
      
      toast.success('Nota guardada correctamente');
      setContent('');
      loadNotes();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'subjective': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'objective': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'assessment': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'plan': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'subjective': return 'Subjetivo (S)';
      case 'objective': return 'Objetivo (O)';
      case 'assessment': return 'Apreciación (A)';
      case 'plan': return 'Plan (P)';
      default: return 'Evolución Estándar';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm text-gray-500">Cargando notas clínicas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Form Container */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-xl shadow-gray-200/20 dark:shadow-none">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Nueva Nota de Evolución
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector Tabs */}
          <div className="flex flex-wrap gap-2 p-1 bg-gray-50 dark:bg-gray-800/50 rounded-2xl w-fit">
            {(['standard', 'subjective', 'objective', 'assessment', 'plan'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEvolutionType(type)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-xl transition-all",
                  evolutionType === type 
                    ? "bg-white dark:bg-gray-800 text-teal-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                {type === 'standard' ? 'Estándar' : type.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>

          <div className="relative group">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={evolutionType === 'standard' ? "Escribe el progreso del paciente..." : `Escribe la parte ${getTypeName(evolutionType)} de tu evolución...`}
              className="w-full min-h-[150px] p-5 text-sm bg-gray-50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none group-hover:bg-white dark:group-hover:bg-gray-800/40"
            />
            <div className="absolute bottom-4 right-4 text-[10px] text-gray-400 font-medium">
              Soporta múltiples párrafos
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-gray-500 italic flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              Tu nota se guardará con fecha y hora actual, firmada por: <strong>{nurseProfile?.full_name}</strong>
            </p>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:shadow-none"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
              Guardar Nota
            </button>
          </div>
        </form>
      </div>

      {/* History List */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          Historial de Evolución
        </h3>

        {notes.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-3xl p-12 border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No hay notas registradas aún para esta atención.</p>
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800">
            {notes.map((note) => (
              <div key={note.note_id} className="relative pl-12 group">
                {/* Timeline dot */}
                <div className="absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-white dark:border-gray-950 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10 transition-colors group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20">
                  <FileText className="w-4 h-4 text-gray-400 group-hover:text-teal-600" />
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm group-hover:border-teal-100 dark:group-hover:border-teal-900/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider",
                        getTypeColor(note.evolution_type)
                      )}>
                        {getTypeName(note.evolution_type)}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold group-hover:text-gray-500">
                        <Clock className="w-3 h-3" />
                        {format(new Date(note.created_at), "HH:mm ' - ' d MMM", { locale: es })}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {note.content}
                  </p>

                  <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-600 font-bold">
                         <User className="w-3 h-3" />
                       </div>
                       <span className="text-[10px] text-gray-500 font-bold">Responded: Enfermería</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ className }: { className?: string }) {
  return <MessageSquare className={className} />;
}
