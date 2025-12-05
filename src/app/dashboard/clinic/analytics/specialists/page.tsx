import React from 'react';
import { getCurrentOrganizationId } from '@/lib/clinic-auth';
import { getSpecialistsPerformance } from '@/lib/actions/analytics';
import Link from 'next/link';
import { ChevronRight, User } from 'lucide-react';

export default async function AnalyticsSpecialistsPage() {
  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return <div>Error de organización</div>;

  const specialists = await getSpecialistsPerformance(organizationId, 'all');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Analítica por Especialista</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {specialists.map((specialist) => (
          <Link 
            key={specialist.id} 
            href={`/dashboard/clinic/analytics/specialists/${specialist.id}`}
            className="block bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">{specialist.name}</h3>
                        <p className="text-sm text-slate-500">{specialist.email}</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                <div>
                    <p className="text-xs text-slate-500">Consultas</p>
                    <p className="font-medium text-slate-900">{specialist.consultations}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500">Ingresos</p>
                    <p className="font-medium text-emerald-600">${specialist.income.toLocaleString()}</p>
                </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
