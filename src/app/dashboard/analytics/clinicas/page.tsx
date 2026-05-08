'use client';

import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  UserCog, 
  ClipboardList,
  ArrowUpRight,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClinicasPage() {
  const [clinicas, setClinicas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadClinicas();
  }, []);

  const loadClinicas = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analytics/data?type=clinicas-detalle&start=2026-01-01T00:00:00Z&end=2026-12-31T23:59:59Z');
      const result = await response.json();
      if (result.data) {
        setClinicas(result.data);
      }
    } catch (error) {
      console.error('Error cargando clínicas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccess = async (userId: string, currentUsed: boolean) => {
    setActionLoading(userId);
    try {
      const response = await fetch('/api/analytics/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-access',
          userId,
          used: !currentUsed
        })
      });

      if (response.ok) {
        // Actualizar estado local
        setClinicas(prev => prev.map(clinica => ({
          ...clinica,
          equipo: clinica.equipo.map((u: any) => 
            u.id === userId ? { ...u, used: !currentUsed } : u
          )
        })));
      }
    } catch (error) {
      console.error('Error al cambiar acceso:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) return;
    
    setActionLoading(userId);
    try {
      const response = await fetch('/api/analytics/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-user',
          userId
        })
      });

      if (response.ok) {
        // Actualizar estado local
        setClinicas(prev => prev.map(clinica => ({
          ...clinica,
          equipo: clinica.equipo.filter((u: any) => u.id !== userId)
        })));
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const calculateDays = (dateString: string) => {
    const start = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalClinicas = clinicas.length;
  const totalPersonal = clinicas.reduce((acc, clinica) => acc + (clinica.equipo?.length || 0), 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Ecosistema de Clínicas</h1>
          <p className="text-gray-500 mt-1">Gestión, control de acceso y monitoreo de suscripciones.</p>
        </div>
        <button 
          onClick={loadClinicas}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Recargar Datos
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* KPIs Superiores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Clínicas Registradas</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalClinicas}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Personal Operativo</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalPersonal}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <UserCog className="w-6 h-6 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Alertas de Pago</p>
                <h3 className="text-3xl font-bold text-red-600 mt-1">
                  {clinicas.filter(c => calculateDays(c.createdAt) > 15).length}
                </h3>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Grid de Clínicas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {clinicas.map((clinica, index) => {
              const diasActiva = calculateDays(clinica.createdAt);
              const isOverdue = diasActiva > 15;

              return (
                <motion.div
                  key={clinica.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl border ${isOverdue ? 'border-red-200' : 'border-gray-100'} shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col`}
                >
                  {/* Cabecera de la Tarjeta */}
                  <div className={`p-6 border-b border-gray-50 ${isOverdue ? 'bg-red-50/30' : 'bg-gradient-to-r from-white to-gray-50/50'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="max-w-[70%]">
                        <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          clinica.type === 'CLINICA' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {clinica.type || 'CONSULTORIO'}
                        </span>
                        <h2 className="text-xl font-bold text-gray-900 mt-2 flex items-center gap-2">
                          {clinica.name}
                        </h2>
                      </div>
                      
                      {/* Badge de Tiempo / Alerta */}
                      <div className={`text-right ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                        <div className={`text-sm font-bold flex items-center gap-1 justify-end ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                          {isOverdue && <AlertTriangle className="w-4 h-4" />}
                          {diasActiva} días activa
                        </div>
                        <p className="text-xs mt-0.5">Reg: {new Date(clinica.createdAt).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>

                    {/* Detalles Rápidos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mt-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{clinica.address || 'No especificada'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{clinica.phone || 'No especificado'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{clinica.contactEmail || 'No especificado'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">ID: {clinica.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* Sección del Equipo Corporativo */}
                  <div className="p-6 bg-gray-50/50 flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Control de Personal
                      </h3>
                      <span className="text-xs text-gray-500">{(clinica.equipo || []).length} Miembros</span>
                    </div>

                    {(clinica.equipo || []).length > 0 ? (
                      <div className="space-y-3">
                        {clinica.equipo.map((miembro: any, mIdx: number) => (
                          <div key={mIdx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 max-w-[60%]">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                                {miembro.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-medium text-gray-900 truncate">{miembro.name}</p>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  miembro.role === 'MEDICO' ? 'bg-blue-50 text-blue-700' :
                                  miembro.role === 'ADMIN' || miembro.role === 'ADMINISTRACION' ? 'bg-emerald-50 text-emerald-700' :
                                  'bg-purple-50 text-purple-700'
                                }`}>
                                  {miembro.role}
                                </span>
                              </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center gap-2">
                              {/* Botón Bloquear/Permitir */}
                              <button
                                onClick={() => handleToggleAccess(miembro.id, miembro.used !== false)}
                                disabled={actionLoading === miembro.id}
                                title={miembro.used !== false ? "Bloquear Acceso" : "Permitir Acceso"}
                                className={`p-2 rounded-lg border transition-colors ${
                                  miembro.used !== false
                                    ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                    : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'
                                }`}
                              >
                                {miembro.used !== false ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </button>

                              {/* Botón Eliminar */}
                              <button
                                onClick={() => handleDeleteUser(miembro.id)}
                                disabled={actionLoading === miembro.id}
                                title="Eliminar Usuario"
                                className="p-2 bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-gray-400">
                        No hay personal asignado en la base de datos.
                      </div>
                    )}
                  </div>

                  {/* Footer de la tarjeta */}
                  <div className="p-4 bg-white border-t border-gray-50 flex justify-end">
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                      Gestionar Clínica
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
