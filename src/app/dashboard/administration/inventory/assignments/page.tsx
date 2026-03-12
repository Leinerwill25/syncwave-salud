'use client';

import React, { useState, useEffect } from 'react';
import { PackageOpen, ArrowLeft, Search, Pill, Stethoscope, AlertCircle, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Assignment {
  id: string;
  patient_id: string;
  medication_id?: string;
  material_id?: string;
  quantity_assigned: number;
  patient_provided: boolean;
  assigned_at: string;
  
  // Joined data
  patients: { first_name: string; last_name: string };
  inventory_medications?: { name: string; dosage: string; presentation: string };
  inventory_materials?: { name: string; specifications: string };
  users: { email: string };
}

export default function AdministrationInventoryAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/administration/assignments/inventory');
      if (!res.ok) throw new Error('Failed to fetch assignments');
      const data = await res.json();
      setAssignments(data.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(a => 
    a.patients.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.patients.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.inventory_medications && a.inventory_medications.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (a.inventory_materials && a.inventory_materials.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
        <div className="pl-4">
          <Link href="/dashboard/administration/inventory" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> Volver a Inventario Base
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <PackageOpen className="w-7 h-7 text-emerald-600" />
            Entregas y Asignaciones
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl">
            Registro histórico de medicamentos y materiales entregados a los pacientes.
          </p>
        </div>
        {/* En un caso real aquí iría el botón para registrar nueva entrega, pero usualmente se hace desde la consulta médica */}
      </div>

      {/* Utilities / Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por paciente o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
          />
        </div>
      </div>

      {/* List / Grid view */}
      {isLoading ? (
        <div className="space-y-4">
           {[...Array(5)].map((_, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse h-24" />
           ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <ShoppingCart className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No hay entregas registradas</h3>
          <p className="text-slate-500 max-w-md mt-2">
            No se han registrado asignaciones de inventario a pacientes en la clínica.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
             const isMed = !!assignment.inventory_medications;
             const itemData = isMed ? assignment.inventory_medications : assignment.inventory_materials;
             const Icon = isMed ? Pill : Stethoscope;

             return (
               <div key={assignment.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                  
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0",
                      isMed ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-teal-50 text-teal-600 border border-teal-100"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">
                        {itemData?.name || 'Producto Desconocido'}
                      </h3>
                      <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                         <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                           {isMed ? 'Medicamento' : 'Material'}
                         </span>
                         {isMed 
                           ? `${(itemData as any)?.dosage} - ${(itemData as any)?.presentation}` 
                           : (itemData as any)?.specifications
                         }
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                     <div className="md:px-6">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Paciente Destino</p>
                        <Link href={`/dashboard/administration/patients/${assignment.patient_id}`} className="font-bold text-blue-600 hover:text-blue-800 transition-colors">
                           {assignment.patients.first_name} {assignment.patients.last_name}
                        </Link>
                     </div>
                     
                     <div className="md:px-6 pt-4 md:pt-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cantidad Asignada</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black text-slate-900">{assignment.quantity_assigned}</span>
                          {assignment.patient_provided && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 border border-amber-200">
                               <AlertCircle className="w-3 h-3" /> Provisto por paciente
                            </span>
                          )}
                        </div>
                     </div>

                     <div className="md:pl-6 pt-4 md:pt-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha de Entrega</p>
                        <p className="text-sm font-medium text-slate-700">
                           {new Date(assignment.assigned_at).toLocaleString()}
                        </p>
                     </div>
                  </div>

               </div>
             );
          })}
        </div>
      )}
    </div>
  );
}
