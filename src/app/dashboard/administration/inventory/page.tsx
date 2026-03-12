'use client';

import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Trash2, Edit2, AlertTriangle, Pill, Stethoscope, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type InventoryTab = 'MEDICACIONES' | 'MATERIALES';

interface Medication {
  id: string;
  name: string;
  quantity: number;
  dosage: string;
  presentation: string;
  expiration_date: string;
}

interface Material {
  id: string;
  name: string;
  quantity: number;
  specifications: string;
  expiration_date?: string;
}

export default function AdministrationInventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('MEDICACIONES');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInventory();
  }, [activeTab]);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const endpoint = activeTab === 'MEDICACIONES' 
        ? '/api/administration/inventory/medications' 
        : '/api/administration/inventory/materials';
        
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      if (activeTab === 'MEDICACIONES') {
        setMedications(data.data || []);
      } else {
        setMaterials(data.data || []);
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const isLowStock = (quantity: number) => quantity < 10;
  
  const filteredItems = (activeTab === 'MEDICACIONES' ? medications : materials).filter((item: any) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
        <div className="pl-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Package className="w-7 h-7 text-emerald-600" />
            Control de Inventario
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl">
            Gestiona medicamentos, material clínico y controla el stock de tu clínica.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
           <Link
             href={`/dashboard/administration/inventory/assignments`}
             className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-1"
           >
             Ver Entregas
           </Link>
           <Link
             href={`/dashboard/administration/inventory/new?type=${activeTab.toLowerCase()}`}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-1"
           >
             <Plus className="w-5 h-5" />
             Añadir Item
           </Link>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('MEDICACIONES')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
              activeTab === 'MEDICACIONES' 
                ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Pill className="w-4 h-4" /> Medicamentos
          </button>
          <button
            onClick={() => setActiveTab('MATERIALES')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
              activeTab === 'MATERIALES' 
                ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Stethoscope className="w-4 h-4" /> Material Clínico
          </button>
        </div>

        <div className="relative w-full md:w-auto md:max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder={`Buscar ${activeTab.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
          />
        </div>
      </div>

      {/* List / Grid view */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
           {[...Array(8)].map((_, i) => (
             <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-40" />
           ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Package className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Inventario vacío</h3>
          <p className="text-slate-500 max-w-md mt-2">
            No se encontraron registros de {activeTab.toLowerCase()} en la clínica.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredItems.map((item: any) => {
            const lowStock = isLowStock(item.quantity);
            const isExpiringSoon = item.expiration_date && new Date(item.expiration_date).getTime() < new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
            
            return (
              <div key={item.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group flex flex-col h-full">
                
                {/* Actions */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10 bg-white/80 backdrop-blur-sm rounded-lg p-1">
                   <Link href={`/dashboard/administration/inventory/${activeTab.toLowerCase()}/${item.id}/edit`} className="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-md transition-colors">
                     <Edit2 className="w-4 h-4" />
                   </Link>
                   <button className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-md transition-colors">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4">
                   <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                     {activeTab === 'MEDICACIONES' 
                       ? <Pill className={`w-6 h-6 ${lowStock ? 'text-amber-500' : 'text-emerald-500'}`} />
                       : <Stethoscope className={`w-6 h-6 ${lowStock ? 'text-amber-500' : 'text-emerald-500'}`} />
                     }
                   </div>
                   
                   <div>
                     <h3 className="font-black text-slate-900 leading-tight">
                       {item.name}
                     </h3>
                     <p className="text-sm font-medium text-slate-500 mt-1">
                       {activeTab === 'MEDICACIONES' ? `${item.dosage} - ${item.presentation}` : item.specifications}
                     </p>
                   </div>
                   
                   <div className="pt-4 border-t border-slate-50 space-y-3">
                     <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock Disponible</span>
                       <span className={`text-xl font-black ${lowStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                         {item.quantity}
                       </span>
                     </div>
                     
                     {item.expiration_date && (
                        <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vencimiento</span>
                         <span className={`text-sm font-semibold ${isExpiringSoon ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md' : 'text-slate-700'}`}>
                           {new Date(item.expiration_date).toLocaleDateString()}
                         </span>
                       </div>
                     )}
                   </div>
                </div>

                {/* Alerts */}
                {(lowStock || isExpiringSoon) && (
                  <div className={`mt-4 pt-3 border-t flex items-start gap-2 text-xs font-semibold ${lowStock ? 'border-rose-100 text-rose-600' : 'border-amber-100 text-amber-600'}`}>
                     <AlertTriangle className="w-4 h-4 shrink-0" />
                     <span>
                       {lowStock && isExpiringSoon ? 'Stock crítico y próximo a vencer.' : 
                        lowStock ? 'Stock crítico, se requiere reabastecimiento.' : 
                        'Próximo a vencer (menos de 30 días).'}
                     </span>
                  </div>
                )}
                
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
