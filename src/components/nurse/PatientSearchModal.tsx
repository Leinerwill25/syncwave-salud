'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, Phone, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import { searchPatientsGlobal, createIndependentPatient } from '@/lib/supabase/nurse.service';
import { toast } from 'sonner';

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientSelected?: (patientId: string, isUnregistered: boolean) => void;
}

export default function PatientSearchModal({ isOpen, onClose, onPatientSelected }: PatientSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'search' | 'create'>('search');
  const [results, setResults] = useState<{ registered: any[], unregistered: any[] }>({ registered: [], unregistered: [] });
  const [loading, setLoading] = useState(false);

  // Formulário de creación
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    identification: '',
    phone: '',
    email: '',
    sex: 'OTHER'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!searchTerm || view !== 'search') {
      setResults({ registered: [], unregistered: [] });
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchPatientsGlobal(searchTerm);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, view]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.phone) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await createIndependentPatient(formData);
      if (error) throw new Error(error);
      toast.success('Paciente registrado exitosamente');
      
      if (onPatientSelected && data?.id) {
        onPatientSelected(data.id, true);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear paciente');
    } finally {
      setSaving(false);
    }
  };

  const resetState = () => {
    setSearchTerm('');
    setView('search');
    setFormData({ first_name: '', last_name: '', identification: '', phone: '', email: '', sex: 'OTHER' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {view === 'search' ? 'Buscar Paciente' : 'Registrar Nuevo Paciente'}
              </h2>
              <button 
                onClick={() => { resetState(); onClose(); }} 
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 h-[500px] overflow-y-auto">
              {view === 'search' ? (
                <div className="space-y-6">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre, apellido o documento..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/20 outline-none transition-all text-gray-900 dark:text-white"
                      autoFocus
                    />
                  </div>

                  <button 
                    onClick={() => setView('create')}
                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-teal-200 dark:border-teal-900/50 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-xl transition-colors font-medium"
                  >
                    <UserPlus className="w-5 h-5" />
                    ¿No encuentras al paciente? Regístralo aquí
                  </button>

                  {/* Results */}
                  <div className="space-y-4">
                    {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>}
                    
                    {!loading && searchTerm && results.registered.length === 0 && results.unregistered.length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">No se encontraron pacientes que coincidan.</p>
                    )}

                    {!loading && (results.registered.length > 0 || results.unregistered.length > 0) && (
                      <div className="space-y-4">
                        {results.unregistered.length > 0 && (
                          <div>
                            <h3 className="text-sm font-bold text-gray-500 mb-2 px-1 uppercase tracking-wider">Tus Pacientes</h3>
                            <div className="space-y-2">
                              {results.unregistered.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 rounded-xl cursor-pointer transition-all group" onClick={() => { onPatientSelected?.(p.id, true); onClose(); }}>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-gray-900 dark:text-white">{p.first_name} {p.last_name}</span>
                                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-1"><CreditCard className="w-3.5 h-3.5"/> {p.identification || 'Sin DNI'}</span>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-teal-500 transition-colors" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {results.registered.length > 0 && (
                          <div>
                            <h3 className="text-sm font-bold text-gray-500 mb-2 mt-4 px-1 uppercase tracking-wider">Pacientes de Clínica</h3>
                            <div className="space-y-2">
                              {results.registered.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 rounded-xl cursor-pointer transition-all group" onClick={() => { onPatientSelected?.(p.id, false); onClose(); }}>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-gray-900 dark:text-white">{p.first_name} {p.last_name}</span>
                                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-1"><CreditCard className="w-3.5 h-3.5"/> {p.identification || 'Sin DNI'}</span>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-teal-500 transition-colors" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreatePatient} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nombres *</label>
                      <input type="text" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Apellidos</label>
                      <input type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Documento</label>
                      <input type="text" value={formData.identification} onChange={e => setFormData({...formData, identification: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Teléfono *</label>
                      <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Sexo</label>
                      <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900 dark:text-white">
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="OTHER">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setView('search')} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Volver a Búsqueda
                    </button>
                    <button type="submit" disabled={saving} className="flex-1 px-4 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Guardar Paciente
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
