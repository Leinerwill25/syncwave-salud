'use client';

import { useState, useEffect } from 'react';
import { useNurseState } from '@/context/NurseContext';
import { getPharmacyInventory, getMedicationList, createPharmacyInventory, updatePharmacyInventory } from '@/lib/supabase/nurse.service';
import type { PharmacyInventory, Medication } from '@/types/nurse.types';
import { Plus, Search, Edit2, AlertTriangle, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function NurseInventoryPage() {
  const { nurseProfile: profile } = useNurseState();
  const [inventory, setInventory] = useState<PharmacyInventory[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add item state
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newLot, setNewLot] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit item state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');

  useEffect(() => {
    if (profile?.organization_id) {
      loadData(profile.organization_id);
    } else {
      setIsLoading(false);
    }
  }, [profile]);

  async function loadData(orgId: string) {
    setIsLoading(true);
    try {
      const [invData, medsData] = await Promise.all([
        getPharmacyInventory(orgId),
        getMedicationList()
      ]);
      setInventory(invData as PharmacyInventory[]);
      setMedications(medsData as Medication[]);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error('Error al cargar inventario');
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddItem = async () => {
    if (!profile?.organization_id) return;
    if (!selectedMedId || !newQuantity) {
      toast.error('Seleccione medicamento y cantidad');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await createPharmacyInventory({
        organization_id: profile.organization_id,
        medication_id: selectedMedId,
        quantity: parseInt(newQuantity, 10),
        lot: newLot || null,
        expiry_date: newExpiry || null,
        unit_cost: 0
      });

      if (error) throw new Error(error);

      toast.success('Insumo agregado al inventario');
      setIsAdding(false);
      setSelectedMedId('');
      setNewQuantity('');
      setNewLot('');
      setNewExpiry('');
      loadData(profile.organization_id);
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar insumo');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: PharmacyInventory) => {
    setEditingId(item.id);
    setEditQuantity(item.quantity.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQuantity('');
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await updatePharmacyInventory(id, { quantity: parseInt(editQuantity, 10) });
      if (error) throw new Error(error);
      
      toast.success('Cantidad actualizada');
      setInventory(prev => prev.map(inv => inv.id === id ? { ...inv, quantity: parseInt(editQuantity, 10) } : inv));
      cancelEdit();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.medication?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.medication?.generic_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!profile?.organization_id) {
    return (
      <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <p className="text-gray-500">No perteneces a ninguna organización</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventario (Farmacia / Suministros)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control de insumos y consumibles de enfermería
          </p>
        </div>
        
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancelar' : 'Añadir Insumo'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-900/30 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Registrar Nuevo Ingreso</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medicamento/Insumo</label>
              <select
                value={selectedMedId}
                onChange={(e) => setSelectedMedId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="">-- Seleccionar --</option>
                {medications.map(med => (
                  <option key={med.id} value={med.id}>{med.name} {med.generic_name ? `(${med.generic_name})` : ''} - {med.form}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad Inicial</label>
              <input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                placeholder="Ej. 50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lote (Opcional)</label>
              <input
                type="text"
                value={newLot}
                onChange={(e) => setNewLot(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                placeholder="Lote"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vencimiento (Opcional)</label>
              <input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            
            <div className="md:col-span-4 flex justify-end mt-2">
              <button
                onClick={handleAddItem}
                disabled={saving || !selectedMedId || !newQuantity}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar en Inventario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar insumo o medicamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Insumo</th>
                <th className="px-6 py-4">Generico / Forma</th>
                <th className="px-6 py-4">Lote</th>
                <th className="px-6 py-4">Vencimiento</th>
                <th className="px-6 py-4">Existencia</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Cargando inventario...</td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron insumos en el inventario.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isLowStock = item.quantity <= 10; // Threshold arbritrario
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                        {item.medication?.name || 'Insumo desconocido'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.medication?.generic_name}
                        {item.medication?.form && <span className="block text-xs text-gray-500">{item.medication.form}</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.lot || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === item.id ? (
                          <input 
                            type="number" 
                            className="w-20 px-2 py-1 border rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 dark:border-gray-700" 
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            min="0"
                          />
                        ) : (
                          <div className={`flex items-center gap-1.5 font-medium ${isLowStock ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {item.quantity}
                            {isLowStock && <AlertTriangle className="w-4 h-4" />}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleSaveEdit(item.id)} disabled={saving} className="text-teal-600 hover:text-teal-700">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} disabled={saving} className="text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => startEdit(item)}
                            className="text-gray-400 hover:text-teal-600 transition-colors"
                            title="Actualizar cantidad"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
