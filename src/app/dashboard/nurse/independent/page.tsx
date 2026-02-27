'use client';

import { useEffect, useState } from 'react';
import { useNurseState } from '@/context/NurseContext';
import { Activity, Users, FileText, Calendar, Plus, Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { getIndependentDashboardStats } from '@/lib/supabase/nurse.service';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import PatientSearchModal from '@/components/nurse/PatientSearchModal';
import { useRouter } from 'next/navigation';

export default function NurseIndependentDashboardPage() {
  const { nurseProfile, alerts } = useNurseState();
  const router = useRouter();
  const [stats, setStats] = useState({ todayQueue: [], activePatientsCount: 0, reportsCompletedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadStats() {
      if (!nurseProfile?.user_id) return;
      
      try {
        const data = await getIndependentDashboardStats(nurseProfile.user_id);
        setStats(data as any);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [nurseProfile?.user_id]);

  // Mock data para KPIs y Agenda rápida integrando datos reales
  const kpis = [
    { title: 'Pacientes Activos (Autónomos)', value: loading ? '...' : stats.activePatientsCount.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Atenciones Hoy', value: loading ? '...' : stats.todayQueue.length.toString(), icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: 'Reportes Completados', value: loading ? '...' : stats.reportsCompletedToday.toString(), icon: FileText, color: 'text-amber-600', bg: 'bg-amber-100' }
  ];

  const agenda = stats.todayQueue.length > 0 ? stats.todayQueue.map((item: any) => ({
    id: item.queue_id,
    patient: item.patient_name || 'Paciente Independiente',
    time: item.arrival_time?.slice(0, 5) || 'Por definir',
    location: item.location || 'Domicilio/Consultorio',
    type: item.motive || 'Atención de Enfermería'
  })) : [];



  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Independiente
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Resumen de tu actividad y pacientes de hoy.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Nueva Atención
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex items-center gap-4"
          >
            <div className={`p-4 rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.title}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Agenda del Día
          </h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            {agenda.map((item, idx) => (
              <div 
                key={item.id} 
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${idx !== agenda.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
              >
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-base">{item.patient}</h4>
                  <p className="text-sm text-gray-500 font-medium">{item.type}</p>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <span className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-3 py-1 rounded-full w-fit">
                    <Clock className="w-3.5 h-3.5" />
                    {item.time}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 w-fit">
                    <MapPin className="w-3.5 h-3.5" />
                    {item.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Column */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            Notificaciones Reales
          </h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
            {alerts.filter(a => !a.dismissed).length > 0 ? (
              alerts.filter(a => !a.dismissed).map((alert, idx) => (
                <div 
                  key={alert.id || idx} 
                  className={`border-l-4 pl-4 py-2 rounded-r-lg transition-all ${
                    alert.type === 'critical' 
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10' 
                      : alert.type === 'warning' 
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10'
                        : 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{alert.title}</h4>
                    {alert.createdAt && (
                       <span className="text-[10px] text-gray-400 font-medium">
                         {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{alert.message}</p>
                  {alert.action && (
                    <button 
                      onClick={() => router.push(alert.action!.href)}
                      className="mt-2 text-[11px] font-bold text-teal-600 hover:underline"
                    >
                      {alert.action.label} →
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6 text-gray-300" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Sin Notificaciones</h4>
                <p className="text-xs text-gray-500 mt-1">Todo está al día por ahora.</p>
              </div>
            )}

            {/* Estado de Licencia (Fijo si no hay alerta crítica) */}
            {nurseProfile?.license_verified && !alerts.some(a => a.id?.includes('license')) && (
              <div className="border-l-4 border-teal-500 pl-4 py-1 bg-teal-50/30 dark:bg-teal-900/5">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Validación Completada</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Credenciales vigentes hasta {nurseProfile.license_expiry ? new Date(nurseProfile.license_expiry).getFullYear() : 'la fecha de expiración'}.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <PatientSearchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onPatientSelected={(id, isUnreg) => {
          // Opcionalmente redirigir al paciente o abrir un modal de atención.
          // Por simplicidad redirigiremos a sus detalles o recargaremos el dashboard.
          router.push(`/dashboard/nurse/patient/${id}?isUnreg=${isUnreg ? 'true' : 'false'}`);
        }} 
      />
    </div>
  );
}

