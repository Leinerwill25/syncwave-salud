'use client';

import { useState, useEffect } from 'react';
import { useNurseState } from '@/context/NurseContext';
import { Search, Plus, Phone, Mail, Stethoscope, Quote, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getReferredDoctors, createReferredDoctor, ReferredDoctor } from '@/lib/supabase/nurse-doctors.service';
import { toast } from 'sonner';

export default function NurseDoctorsPage() {
  const { nurseProfile } = useNurseState();
  const [searchTerm, setSearchTerm] = useState('');
  const [doctors, setDoctors] = useState<ReferredDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    doctor_name: '',
    specialty: '',
    phone: '',
    email: '',
  });

  const fetchDoctors = async () => {
    if (!nurseProfile?.nurse_profile_id) return;
    setLoading(true);
    try {
      const data = await getReferredDoctors(nurseProfile.nurse_profile_id);
      setDoctors(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar la lista de doctores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [nurseProfile?.nurse_profile_id]);

  const filteredDoctors = doctors.filter(doc => 
    doc.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (doc.specialty || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseProfile?.nurse_profile_id) {
      toast.error('Perfil de enfermera no identificado');
      return;
    }
    if (!formData.doctor_name) {
      toast.error('El nombre del doctor es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await createReferredDoctor({
        nurse_id: nurseProfile.nurse_profile_id,
        ...formData
      });
      if (error) throw new Error(error);
      
      toast.success('Doctor registrado exitosamente');
      setIsModalOpen(false);
      setFormData({ doctor_name: '', specialty: '', phone: '', email: '' });
      fetchDoctors();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el doctor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-600" /> Doctores Referentes
          </h1>
          <p className="text-sm text-gray-500">
            Administra los médicos externos o especialistas con los que colaboras para tus pacientes.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium shadow-md shadow-teal-600/20"
        >
          <Plus className="w-4 h-4" />
          Registrar Doctor
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o especialidad..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-teal-100 outline-none transition-all"
          />
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : filteredDoctors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc, idx) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-gray-100 hover:border-teal-300 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center border border-teal-100 text-teal-600 font-bold text-lg">
                    {doc.doctor_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">{doc.doctor_name}</h3>
                    <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                      {doc.specialty || 'Medicina General'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-auto pt-4 border-t border-gray-50">
                {doc.phone && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    {doc.phone}
                  </div>
                )}
                {doc.email && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    {doc.email}
                  </div>
                )}
                {!doc.phone && !doc.email && (
                  <p className="text-sm text-gray-400 italic">No hay información de contacto.</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Quote className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Ningún doctor encontrado</h3>
          <p className="text-gray-500 max-w-sm">No has agregado médicos referentes o tu búsqueda no dio resultados.</p>
          <button onClick={() => setIsModalOpen(true)} className="mt-4 text-teal-600 font-bold hover:underline">Registrar el primero</button>
        </div>
      )}

      {/* Create Doctor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Registrar Doctor Referente</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateDoctor} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Nombre del Doctor/a *</label>
                  <input type="text" required autoFocus value={formData.doctor_name} onChange={(e) => setFormData({...formData, doctor_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="Ej. Dr. Mario Ruiz" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Especialidad</label>
                  <input type="text" value={formData.specialty} onChange={(e) => setFormData({...formData, specialty: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="Ej. Traumatología" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Teléfono</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="Opcional" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Correo Electrónico</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all text-gray-900" placeholder="Opcional" />
                </div>
                
                <div className="pt-4 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="px-5 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
