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
  const [modalOpen, setModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [subsModalOpen, setSubsModalOpen] = useState(false);
  const [selectedClinica, setSelectedClinica] = useState<any>(null);
  useEffect(() => {
    loadClinicas();
  }, []);

  const calculateDays = (dateString: string) => {
    const start = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getSubscriptionStatus = (createdAt: string, subscriptionData: any) => {
    const days = calculateDays(createdAt);
    const isPaid = subscriptionData?.planSnapshot?.isPaid === true;
    const endDate = subscriptionData?.endDate ? new Date(subscriptionData.endDate) : null;

    // Si lleva menos de 15 días desde su creación, está en prueba
    if (days <= 15) {
      return { status: 'Prueba', color: 'bg-green-50 text-green-700', canManage: false, daysLeft: 15 - days };
    }

    // Si pagó y la suscripción no ha vencido
    if (isPaid && endDate && endDate > new Date()) {
      const diffTime = Math.abs(endDate.getTime() - new Date().getTime());
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { status: 'Activa', color: 'bg-emerald-50 text-emerald-700', canManage: true, daysLeft: daysLeft };
    }

    // Si no ha pagado o ya venció, entramos en mora basándonos en los días de creación
    const daysDefault = days - 15;

    if (daysDefault <= 2) {
      return { status: 'Mora Temprana', color: 'bg-yellow-50 text-yellow-700', canManage: true, daysLeft: 2 - daysDefault };
    }
    if (daysDefault <= 5) {
      return { status: 'Mora Tardía', color: 'bg-orange-50 text-orange-700', canManage: true, daysLeft: 5 - daysDefault };
    }
    
    // Al 5to día de mora se suspende
    return { status: 'Suspendida', color: 'bg-red-50 text-red-700', canManage: true, daysLeft: 0 };
  };

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

  const handleSaveSubscription = async (organizationId: string, isPaid: boolean) => {
    try {
      const response = await fetch('/api/analytics/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'manage-subscription', organizationId, isPaid })
      });
      const result = await response.json();
      if (result.success) {
        loadClinicas(); // Recargar datos de la base de datos
        setSubsModalOpen(false);
        setSelectedClinica(null);
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
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

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setModalOpen(true);
  };

  const executeDeleteUser = async (userId: string) => {
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


  const totalClinicas = clinicas.length;
  const totalPersonal = clinicas.reduce((acc, clinica) => acc + (clinica.equipo?.length || 0), 0);
  
  const clinicasEnMora = clinicas.filter(c => {
    const subStatus = getSubscriptionStatus(c.createdAt, c.subscriptionData);
    return subStatus.status === 'Mora Temprana' || subStatus.status === 'Mora Tardía' || subStatus.status === 'Suspendida';
  }).length;
  
  const porcentajeMora = totalClinicas > 0 ? ((clinicasEnMora / totalClinicas) * 100).toFixed(1) : '0.0';

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
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-red-600">{clinicasEnMora}</h3>
                  <span className="text-sm font-medium text-red-500">({porcentajeMora}%)</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">En mora o suspendidas</p>
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
              const subStatus = getSubscriptionStatus(clinica.createdAt, clinica.subscriptionData);
              const isSuspended = subStatus.status === 'Suspendida';

              return (
                <motion.div
                  key={clinica.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl border ${
                    subStatus.status === 'Suspendida' ? 'border-red-300' :
                    subStatus.status === 'Mora Tardía' ? 'border-orange-200' :
                    subStatus.status === 'Mora Temprana' ? 'border-yellow-200' :
                    'border-gray-100'
                  } shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col`}
                >
                  {/* Cabecera de la Tarjeta */}
                  <div className={`p-6 border-b border-gray-50 ${
                    subStatus.status === 'Suspendida' ? 'bg-red-50/50' :
                    subStatus.status === 'Mora Tardía' ? 'bg-orange-50/30' :
                    subStatus.status === 'Mora Temprana' ? 'bg-yellow-50/30' :
                    'bg-gradient-to-r from-white to-gray-50/50'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="max-w-[65%]">
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
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${subStatus.color}`}>
                            {subStatus.status}
                          </span>
                          <div className={`text-sm font-bold flex items-center gap-1 ${subStatus.status === 'Suspendida' ? 'text-red-600' : 'text-gray-900'}`}>
                            {subStatus.status === 'Suspendida' && <AlertTriangle className="w-4 h-4" />}
                            {diasActiva} días
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">Reg: {new Date(clinica.createdAt).toLocaleDateString('es-ES')}</p>
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
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                    miembro.role === 'MEDICO' ? 'bg-blue-50 text-blue-700' :
                                    miembro.role === 'ADMIN' || miembro.role === 'ADMINISTRACION' ? 'bg-emerald-50 text-emerald-700' :
                                    'bg-purple-50 text-purple-700'
                                  }`}>
                                    {miembro.role}
                                  </span>
                                  {miembro.specialty && (
                                    <span className="text-xs text-gray-500 truncate" title={miembro.specialty}>
                                      • {miembro.specialty}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center gap-2">
                              {/* Botón Bloquear/Permitir */}
                              {/* Botón Bloquear/Permitir */}
                              <button
                                onClick={() => handleToggleAccess(miembro.id, miembro.used !== false)}
                                disabled={actionLoading === miembro.id || isSuspended}
                                title={isSuspended ? "Suspendido por falta de pago" : (miembro.used !== false ? "Bloquear Acceso" : "Permitir Acceso")}
                                className={`p-2 rounded-lg border transition-colors ${
                                  isSuspended
                                    ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed'
                                    : miembro.used !== false
                                      ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                      : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'
                                }`}
                              >
                                {isSuspended ? <Lock className="w-4 h-4" /> : (miembro.used !== false ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />)}
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
                  <div className="p-4 bg-white border-t border-gray-50 flex justify-between items-center">
                    <div>
                      {subStatus.canManage && (
                        <button
                          onClick={() => {
                            setSelectedClinica(clinica);
                            setSubsModalOpen(true);
                          }}
                          className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            subStatus.status === 'Suspendida' ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' :
                            subStatus.status === 'Mora Tardía' ? 'bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100' :
                            subStatus.status === 'Mora Temprana' ? 'bg-yellow-50 border-yellow-100 text-yellow-600 hover:bg-yellow-100' :
                            'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Gestionar Suscripción
                        </button>
                      )}
                    </div>
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

      {/* Modal de Confirmación para Eliminar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-lg max-w-md w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900">¿Estás seguro?</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente de la plataforma.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (userToDelete) {
                    executeDeleteUser(userToDelete);
                  }
                  setModalOpen(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Aceptar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Gestión de Suscripción */}
      {subsModalOpen && selectedClinica && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-lg max-w-md w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-4 text-blue-600">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900">Gestionar Suscripción</h3>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">
                Clínica: <span className="font-semibold text-gray-900">{selectedClinica.name}</span>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Días activa: <span className="font-semibold text-gray-900">{calculateDays(selectedClinica.createdAt)} días</span>
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">Estado del Pago</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSaveSubscription(selectedClinica.id, true)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      selectedClinica.subscriptionData?.planSnapshot?.isPaid === true
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Pagado
                  </button>
                  <button
                    onClick={() => handleSaveSubscription(selectedClinica.id, false)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      selectedClinica.subscriptionData?.planSnapshot?.isPaid === false || selectedClinica.subscriptionData === undefined
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    No Pagado
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSubsModalOpen(false);
                  setSelectedClinica(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors w-full"
              >
                Cerrar y Aplicar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
