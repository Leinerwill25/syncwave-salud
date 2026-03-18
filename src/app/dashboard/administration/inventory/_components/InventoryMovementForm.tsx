'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search, 
  Package, 
  ShoppingBag, 
  UserCheck, 
  Plus, 
  Pill, 
  Stethoscope 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  inventoryMovementSchema, 
  InventoryMovementFormValues 
} from '@/lib/schemas/inventoryMovementSchema';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  type: 'MATERIAL' | 'MEDICAMENTO';
}

interface Props {
  mode: 'PURCHASE' | 'DELIVERY';
  initialType?: 'material' | 'medication';
}

export default function InventoryMovementForm({ mode, initialType = 'medication' }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'MATERIAL' | 'MEDICAMENTO'>(
    initialType === 'material' ? 'MATERIAL' : 'MEDICAMENTO'
  );
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<InventoryMovementFormValues>({
    resolver: zodResolver(inventoryMovementSchema),
    defaultValues: {
      itemId: '',
      itemType: activeTab,
      type: mode === 'PURCHASE' ? 'IN' : 'OUT',
      reason: mode === 'PURCHASE' ? 'COMPRA' : 'ENTREGA',
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
    } as InventoryMovementFormValues
  });

  const watchQuantity = watch('quantity') || 0;
  const watchUnitPrice = watch('unitPrice') || 0;

  // Actualizar total al cambiar cantidad o precio unitario
  useEffect(() => {
    if (mode === 'PURCHASE') {
      setValue('totalAmount', watchQuantity * watchUnitPrice);
    }
  }, [watchQuantity, watchUnitPrice, mode, setValue]);

  // Cargar ítems al buscar o cambiar pestaña
  useEffect(() => {
    const fetchItems = async () => {
      if (searchTerm.length < 2) {
        setItems([]);
        return;
      }
      
      setIsLoadingItems(true);
      try {
        const type = activeTab === 'MATERIAL' ? 'materials' : 'medications';
        const res = await fetch(`/api/administration/inventory/${type}?search=${searchTerm}&limit=10`);
        const data = await res.json();
        setItems(data.data || []);
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  const handleSelectItem = (item: any) => {
    setSelectedItem({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      type: activeTab
    });
    setValue('itemId', item.id);
    setValue('itemType', activeTab);
    setSearchTerm(item.name);
    setShowDropdown(false);
  };

  const onSubmit = async (values: InventoryMovementFormValues) => {
    if (!selectedItem) {
      toast.error('Por favor selecciona un ítem del inventario');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/administration/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al registrar el movimiento');

      toast.success(mode === 'PURCHASE' ? 'Compra registrada con éxito' : 'Entrega registrada con éxito');
      router.push('/dashboard/administration/inventory');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Botón Volver */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm uppercase tracking-tighter"
      >
        <ArrowLeft size={18} />
        Volver al Inventario
      </button>

      {/* Título y Header */}
      <div className={cn(
        "p-8 rounded-3xl border border-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden",
        mode === 'PURCHASE' ? "bg-blue-600 text-white" : "bg-slate-900 text-white"
      )}>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              {mode === 'PURCHASE' ? <ShoppingBag size={24} /> : <UserCheck size={24} />}
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight leading-none">
                {mode === 'PURCHASE' ? 'Registrar Compra' : 'Registrar Entrega'}
              </h1>
              <p className="text-white/70 text-sm font-medium mt-1 uppercase tracking-wider italic">
                {mode === 'PURCHASE' ? 'Ingreso de nuevos suministros al inventario' : 'Egreso de insumos para uso clínico'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Selección de Item */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Package className="text-blue-500" size={18} />
                Selección de Producto
              </h2>
              
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('MEDICAMENTO');
                    setSelectedItem(null);
                    setSearchTerm('');
                    setValue('itemType', 'MEDICAMENTO');
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                    activeTab === 'MEDICAMENTO' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                  )}
                >
                  Medicamento
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('MATERIAL');
                    setSelectedItem(null);
                    setSearchTerm('');
                    setValue('itemType', 'MATERIAL');
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                    activeTab === 'MATERIAL' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                  )}
                >
                  Material
                </button>
              </div>
            </div>

            {/* Buscador de Producto */}
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Buscar en el inventario
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={`Escribe el nombre del ${activeTab.toLowerCase()}...`}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50/50 focus:border-blue-200 transition-all font-bold text-slate-700"
                />
                
                {showDropdown && (searchTerm.length >= 2 || items.length > 0) && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-2">
                    {isLoadingItems && (
                      <div className="p-4 text-center text-slate-400 font-bold text-sm">Buscando...</div>
                    )}
                    {!isLoadingItems && items.length === 0 && (
                      <div className="p-4 text-center text-slate-400 font-bold text-sm italic">
                        No se encontraron resultados en {activeTab === 'MATERIAL' ? 'Insumos' : 'Medicinas'}
                      </div>
                    )}
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors lowercase">
                            {activeTab === 'MEDICAMENTO' ? <Pill size={16} /> : <Stethoscope size={16} />}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-700 uppercase">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold">{activeTab}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-blue-600">{item.quantity}</div>
                          <div className="text-[9px] text-slate-300 font-black uppercase">En stock</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Datos Dinámicos (Detalle de Gasto o Recepción) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {mode === 'PURCHASE' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Proveedor</label>
                    <input
                      {...register('supplierName')}
                      placeholder="Nombre del proveedor o droguería"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Precio Unitario ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('unitPrice', { valueAsNumber: true })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 font-bold text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Entregado a (Nombre)</label>
                    <input
                      {...register('recipientName')}
                      placeholder="Nombre de la enfermera/médico/paciente"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-slate-100 font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Motivo / Notas</label>
                    <input
                      {...register('notes')}
                      placeholder="Ej: Uso en quirófano Sala A"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-slate-100 font-bold text-sm"
                    />
                  </div>
                </>
              )}
            </div>
            
            {mode === 'PURCHASE' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Notas Adicionales</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Detalles sobre el lote, facturación, etc."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 font-bold text-sm resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Confirmación y Cantidades */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6 sticky top-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-4">
              Detalle del Movimiento
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Cantidad a {mode === 'PURCHASE' ? 'Ingresar' : 'Entregar'}
                </label>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      const cur = watch('quantity');
                      if (cur > 1) setValue('quantity', cur - 1);
                    }}
                    className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black hover:bg-slate-200 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    {...register('quantity', { valueAsNumber: true })}
                    className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-lg focus:ring-4 focus:ring-blue-50 outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      const cur = watch('quantity');
                      setValue('quantity', cur + 1);
                    }}
                    className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black hover:bg-slate-200 transition-colors"
                  >
                    +
                  </button>
                </div>
                {errors.quantity && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.quantity.message}</p>}
              </div>

              {/* Comparador de Stock */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase italic">
                  <span className="text-slate-400">Stock Actual</span>
                  <span className="text-slate-600">{selectedItem?.quantity || 0}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase italic">
                  <span className="text-slate-400">{mode === 'PURCHASE' ? 'Ingreso' : 'Egreso'}</span>
                  <span className={mode === 'PURCHASE' ? "text-blue-500" : "text-rose-500"}>
                    {mode === 'PURCHASE' ? '+' : '-'}{watchQuantity}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-slate-800">Stock Final</span>
                  <span className={cn(
                    "text-lg font-black",
                    mode === 'PURCHASE' ? "text-emerald-500" : "text-slate-900"
                  )}>
                    {selectedItem ? (mode === 'PURCHASE' ? selectedItem.quantity + watchQuantity : selectedItem.quantity - watchQuantity) : '--'}
                  </span>
                </div>
              </div>

              {mode === 'PURCHASE' && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex justify-between items-center">
                   <span className="text-xs font-black uppercase text-blue-800">Inversión Total</span>
                   <span className="text-lg font-black text-blue-600">${watch('totalAmount')?.toFixed(2)}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedItem}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2",
                mode === 'PURCHASE' 
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 disabled:opacity-50" 
                  : "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/20 disabled:opacity-50"
              )}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {mode === 'PURCHASE' ? 'Confirmar Compra' : 'Confirmar Entrega'}
            </button>
            {!selectedItem && <p className="text-[9px] text-center text-slate-400 font-bold italic uppercase mt-2">Selecciona un producto primero</p>}
          </div>
        </div>
      </form>
    </div>
  );
}
