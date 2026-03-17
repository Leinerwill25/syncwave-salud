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
    <div className="p-4 md:p-8 lg:p-12 space-y-4 md:space-y-8 animate-in fade-in duration-500 max-w-screen overflow-x-hidden pb-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-emerald-500" />
        <div className="pl-3 md:pl-4">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
            <Package className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" />
            Inventario Clínico
          </h1>
          <p className="text-slate-500 mt-1 text-xs md:text-sm max-w-xl">
            Control de medicamentos y materiales.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
           <Link
             href={`/dashboard/administration/inventory/assignments`}
             className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs md:text-sm uppercase tracking-tighter"
           >
             Movimientos
           </Link>
           <Link
             href={`/dashboard/administration/inventory/new?type=${activeTab.toLowerCase()}`}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-xs md:text-sm uppercase tracking-tighter"
           >
             <Plus className="w-4 h-4" />
             Nuevo Item
           </Link>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
        
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full lg:w-auto">
          <button
            onClick={() => setActiveTab('MEDICACIONES')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 rounded-lg font-bold text-[10px] md:text-sm transition-all duration-300 uppercase tracking-tighter ${
              activeTab === 'MEDICACIONES' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Pill className="w-3.5 h-3.5 md:w-4 md:h-4" /> Medicinas
          </button>
          <button
            onClick={() => setActiveTab('MATERIALES')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 rounded-lg font-bold text-[10px] md:text-sm transition-all duration-300 uppercase tracking-tighter ${
              activeTab === 'MATERIALES' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 md:w-4 md:h-4" /> Insumos
          </button>
        </div>

        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          <input 
            type="text"
            placeholder={`Filtrar ${activeTab.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs md:text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
          />
        </div>
      </div>

      {/* List / Grid view */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
           {[...Array(8)].map((_, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm animate-pulse h-40" />
           ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white p-8 md:p-12 rounded-2xl md:rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 md:w-10 md:h-10 text-slate-400" />
          </div>
          <h3 className="text-base md:text-lg font-bold text-slate-900 uppercase">Sin resultados</h3>
          <p className="text-slate-500 text-xs md:text-sm mt-2">
            No se encontraron registros de {activeTab.toLowerCase()}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 pb-6">
          {filteredItems.map((item: any) => {
            const lowStock = isLowStock(item.quantity);
            const isExpiringSoon = item.expiration_date && new Date(item.expiration_date).getTime() < new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
            
            return (
              <div key={item.id} className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 relative group flex flex-col h-full">
                
                {/* Actions */}
                <div className="absolute top-2 right-2 md:top-4 md:right-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                   <Link href={`/dashboard/administration/inventory/${activeTab.toLowerCase()}/${item.id}/edit`} className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors shadow-sm">
                     <Edit2 className="w-3 md:w-4 h-3 md:h-4" />
                   </Link>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3 md:space-y-4">
                   <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                     {activeTab === 'MEDICACIONES' 
                       ? <Pill className={`w-5 h-5 md:w-6 md:h-6 ${lowStock ? 'text-amber-500' : 'text-emerald-500'}`} />
                       : <Stethoscope className={`w-5 h-5 md:w-6 md:h-6 ${lowStock ? 'text-amber-500' : 'text-emerald-500'}`} />
                     }
                   </div>
                   
                   <div>
                     <h3 className="font-bold text-slate-900 leading-tight text-xs md:text-base uppercase tracking-tight line-clamp-2 min-h-[2.5rem] md:min-h-0">
                       {item.name}
                     </h3>
                     <p className="text-[9px] md:text-sm font-medium text-slate-400 mt-1 uppercase truncate">
                       {activeTab === 'MEDICACIONES' ? `${item.dosage} - ${item.presentation}` : item.specifications}
                     </p>
                   </div>
                   
                   <div className="pt-3 md:pt-4 border-t border-slate-50 space-y-2 md:space-y-3">
                     <div className="flex items-center justify-between">
                       <span className="text-[9px] md:text-xs font-black text-slate-300 uppercase tracking-widest leading-none">Stock</span>
                       <span className={`text-base md:text-xl font-black ${lowStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                         {item.quantity}
                       </span>
                     </div>
                     
                     {item.expiration_date && (
                        <div className="flex items-center justify-between">
                         <span className="text-[9px] md:text-xs font-black text-slate-300 uppercase tracking-widest leading-none">Vence</span>
                         <span className={`text-[10px] md:text-sm font-bold ${isExpiringSoon ? 'text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md' : 'text-slate-700'}`}>
                           {new Date(item.expiration_date).toLocaleDateString(undefined, {month: 'short', year: '2-digit'})}
                         </span>
                       </div>
                     )}
                   </div>
                </div>

                {/* Alerts (Compact for mobile) */}
                {(lowStock || isExpiringSoon) && (
                  <div className={`mt-3 pt-2 border-t flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter ${lowStock ? 'border-rose-100 text-rose-500' : 'border-amber-100 text-amber-500'}`}>
                     <AlertTriangle className="w-3 h-3 shrink-0" />
                     <span className="line-clamp-1">
                       {lowStock ? 'Reabastecer' : 'Vencimiento'}
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
