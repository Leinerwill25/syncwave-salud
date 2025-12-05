import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getSpecialistsPerformance } from '@/lib/actions/analytics';
import { Users, Calendar, DollarSign, Activity } from 'lucide-react';

export default async function AnalyticsDataPage() {
  const organizationId = await getCurrentOrganizationId();

  if (!organizationId) {
    return <div className="p-6 text-center text-slate-500">No se pudo identificar la organización.</div>;
  }

  const specialists = await getSpecialistsPerformance(organizationId, 'month');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analítica de Datos</h1>
          <p className="text-slate-500">Rendimiento detallado por especialista (Mes actual)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Especialista</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Consultas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pacientes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ingresos Generados</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Días de Atención</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {specialists.map((specialist) => (
                <tr key={specialist.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center text-sky-700 font-bold">
                        {specialist.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">{specialist.name}</div>
                        <div className="text-sm text-slate-500">{specialist.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-slate-700">
                        <Activity className="w-4 h-4 mr-2 text-slate-400" />
                        {specialist.consultations}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-slate-700">
                        <Users className="w-4 h-4 mr-2 text-slate-400" />
                        {specialist.patients}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-medium text-emerald-600">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {specialist.income.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {/* Placeholder para días de atención, requeriría más lógica de DB */}
                        Lunes - Viernes
                    </div>
                  </td>
                </tr>
              ))}
              {specialists.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No hay datos disponibles para este periodo.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
