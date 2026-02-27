'use client';

import { useState, useEffect } from 'react';
import { useNurseState } from '@/context/NurseContext';
import { User, Shield, Briefcase, Mail, Phone, MapPin, UploadCloud, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateNurseProfile } from '@/lib/supabase/nurse.service';

export default function NurseIndependentSettingsPage() {
  const { nurseProfile } = useNurseState();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    licenseNumber: '',
    isLicenseVerified: false,
    scope: {
      homeVisits: false,
      ivAdministration: false,
      woundCare: false,
      pediatric: false,
      elderly: false,
    }
  });

  useEffect(() => {
    if (nurseProfile) {
      setFormData({
        name: nurseProfile.full_name || '',
        email: nurseProfile.email || '',
        phone: nurseProfile.organization_phone || '',
        specialty: nurseProfile.specializations?.join(', ') || '',
        licenseNumber: nurseProfile.license_number || '',
        isLicenseVerified: nurseProfile.license_verified || false,
        scope: {
          homeVisits: nurseProfile.independent_scope?.home_visits || false,
          ivAdministration: nurseProfile.independent_scope?.iv_administration || false,
          woundCare: nurseProfile.independent_scope?.wound_care || false,
          pediatric: nurseProfile.independent_scope?.pediatric || false,
          elderly: nurseProfile.independent_scope?.elderly || false,
        }
      });
    }
  }, [nurseProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseProfile?.nurse_profile_id) return;

    setSaving(true);
    try {
      const scopeData = {
        home_visits: formData.scope.homeVisits,
        iv_administration: formData.scope.ivAdministration,
        wound_care: formData.scope.woundCare,
        pediatric: formData.scope.pediatric,
        elderly: formData.scope.elderly
      };

      const specializations = formData.specialty.split(',').map(s => s.trim()).filter(Boolean);

      const { error } = await updateNurseProfile(nurseProfile.nurse_profile_id, {
        independent_scope: scopeData as any,
        specializations: specializations
      });

      if (error) throw new Error(error);
      toast.success('Perfil actualizado correctamente.');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mi Perfil y Credenciales
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Administra tu información personal y alcance de práctica independiente.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Datos Personales */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Información Personal</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nombre Completo</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                Especialidad Principal
              </label>
              <input 
                type="text" 
                value={formData.specialty}
                onChange={e => setFormData({...formData, specialty: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm flex items-center text-gray-700 dark:text-gray-300 gap-2 font-bold"><Mail className="w-4 h-4 text-gray-400"/> Correo Electrónico</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm flex items-center text-gray-700 dark:text-gray-300 gap-2 font-bold"><Phone className="w-4 h-4 text-gray-400"/> Teléfono</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Credenciales y Seguridad */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Credenciales y Licencia</h2>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">Estado de Licencia</p>
                {formData.isLicenseVerified ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold">Verificada por el Ente Regulador</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-bold">Pendiente de Validación</span>
                  </div>
                )}
              </div>
              <button type="button" className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium shadow-sm">
                Solicitar Re-evaluación
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Número de Licencia / Registro</label>
                <input 
                  type="text" 
                  value={formData.licenseNumber}
                  readOnly={formData.isLicenseVerified}
                  onChange={e => setFormData({...formData, licenseNumber: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 outline-none transition-all ${
                    formData.isLicenseVerified 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed' 
                      : 'bg-white focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20'
                  }`}
                />
                {formData.isLicenseVerified && (
                  <p className="text-xs text-gray-500 mt-1">Contacte soporte para actualizar una licencia ya verificada.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Documento Respaldo (PDF, JPG)</label>
                <div className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors cursor-pointer group">
                  <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    <UploadCloud className="w-5 h-5" /> Subir archivo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alcance de Práctica */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Alcance de Práctica</h2>
              <p className="text-xs text-gray-500">Servicios que ofreces como profesional independiente.</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <input 
                type="checkbox" 
                checked={formData.scope.homeVisits} 
                onChange={e => setFormData({
                  ...formData, 
                  scope: {...formData.scope, homeVisits: e.target.checked}
                })}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-300">Visitas Domiciliarias</span>
            </label>
            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <input 
                type="checkbox" 
                checked={formData.scope.ivAdministration} 
                onChange={e => setFormData({
                  ...formData, 
                  scope: {...formData.scope, ivAdministration: e.target.checked}
                })}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-300">Administración de vías (IV/IM)</span>
            </label>
            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <input 
                type="checkbox" 
                checked={formData.scope.woundCare} 
                onChange={e => setFormData({
                  ...formData, 
                  scope: {...formData.scope, woundCare: e.target.checked}
                })}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-300">Manejo y Cuidado de Heridas</span>
            </label>
            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <input 
                type="checkbox" 
                checked={formData.scope.elderly} 
                onChange={e => setFormData({
                  ...formData, 
                  scope: {...formData.scope, elderly: e.target.checked}
                })}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-300">Atención Geriátrica Exclusiva</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            className="flex items-center gap-2 px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-1 active:scale-95"
          >
            <Save className="w-5 h-5" />
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}
