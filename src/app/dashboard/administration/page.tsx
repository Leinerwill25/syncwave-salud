import React from 'react';
import { 
  Users, 
  UserSquare2, 
  CalendarCheck, 
  AlertCircle,
  Activity,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth-guards';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

async function getStats(organizationId: string) {
  // Usar service role para bypassear RLS y ver datos reales
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1. Obtener todos los authIds del staff de la organización
  const { data: allOrgUsers } = await supabase
    .from('users')
    .select('authId')
    .eq('organizationId', organizationId);

  const allOrgAuthIds = allOrgUsers?.map((u: any) => u.authId).filter(Boolean) || [];

  const [patientsCountResult, specialists, appointments, medications, materials] = await Promise.all([
    allOrgAuthIds.length > 0 
      ? supabase.from('unregisteredpatients').select('id', { count: 'exact', head: true }).in('created_by', allOrgAuthIds)
      : Promise.resolve({ count: 0 }),
    supabase.from('specialists').select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    supabase.from('admin_appointments').select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'PENDIENTE'),
    supabase.from('admin_inventory_medications').select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .lt('quantity', 10),
    supabase.from('admin_inventory_materials').select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .lt('quantity', 10),
  ]);

  return {
    totalPatients: patientsCountResult.count || 0,
    totalSpecialists: specialists.count || 0,
    pendingAppointments: appointments.count || 0,
    inventoryAlerts: (medications.count || 0) + (materials.count || 0),
  };
}

export default async function AdministrationDashboardPage() {
  // Obtener usuario autenticado para conocer su organizationId
  const user = await requireRole(['ADMINISTRACION', 'ADMIN']);
  if (!user) redirect('/login');

  const organizationId = user.organizationId || '';
  const stats = await getStats(organizationId);

  const statCards = [
    {
      title: 'Pacientes Activos',
      value: stats.totalPatients,
      icon: Users,
      trend: '+12%',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      href: '/dashboard/administration/patients'
    },
    {
      title: 'Especialistas',
      value: stats.totalSpecialists,
      icon: UserSquare2,
      trend: '+2',
      color: 'from-teal-500 to-emerald-500',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      href: '/dashboard/administration/specialists'
    },
    {
      title: 'Citas Pendientes',
      value: stats.pendingAppointments,
      icon: CalendarCheck,
      trend: 'Atención',
      color: 'from-amber-400 to-orange-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      href: '/dashboard/administration/appointments'
    },
    {
      title: 'Alertas Inventario',
      value: stats.inventoryAlerts,
      icon: AlertCircle,
      trend: 'Crítico',
      color: 'from-rose-500 to-red-500',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      href: '/dashboard/administration/inventory'
    }
  ];

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-screen overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="w-6 h-6 md:w-8 md:h-8 text-teal-600" />
            Panel de Administración
          </h1>
          <p className="text-slate-500 mt-2 text-sm md:text-lg">
            Resumen operativo y estado general de la clínica.
          </p>
        </div>
        <div className="hidden md:block text-sm font-medium text-slate-400 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          Estado Actualizado
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="group bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-start justify-between relative z-10 w-full">
                <div className="space-y-2 md:space-y-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.textColor}`} />
                  </div>
                  <div>
                    <h3 className="text-slate-500 font-medium text-[10px] md:text-sm uppercase tracking-wider">{stat.title}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                       <span className="text-xl md:text-4xl font-black text-slate-900 tracking-tight">{stat.value}</span>
                    </div>
                  </div>
                </div>
                
                <div className={`px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold ${stat.bgColor} ${stat.textColor} flex items-center gap-1 shrink-0`}>
                  <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  {stat.trend}
                </div>
              </div>

              <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-50 relative z-10">
                <Link 
                  href={stat.href}
                  className={`text-[10px] md:text-sm font-bold ${stat.textColor} flex items-center gap-2 group-hover:gap-3 transition-all`}
                >
                  Detalles <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Link>
              </div>

              <div className={`absolute -bottom-16 -right-16 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`} />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
           <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
             <CalendarCheck className="w-6 h-6 text-teal-600" />
             Actividad Reciente
           </h3>
           <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Activity className="w-8 h-8 text-slate-300" />
             </div>
             <p className="text-slate-500 font-medium">El panel de actividad detallada estará disponible pronto.</p>
           </div>
        </div>
        
        <div className="bg-gradient-to-br from-teal-900 to-slate-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Resumen Clínico</h3>
            <p className="text-teal-100 text-sm mb-8 leading-relaxed">Mantén un control total sobre las operaciones, especialistas y la atención brindada a los pacientes.</p>
            
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">Citas Hoy</div>
                <div className="text-3xl font-black">24</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">Nuevos Pacientes</div>
                <div className="text-3xl font-black">+5</div>
              </div>
            </div>
          </div>
          
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        </div>
      </div>
    </div>
  );
}
