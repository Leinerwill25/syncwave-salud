'use client';

import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, Smartphone, RefreshCw, Layers } from 'lucide-react';
import type { BancaribeMovimientoItem } from '@/lib/bancaribe/types';

interface Props {
  organizationId: string;
  tasaBCV: number | null;
  onGoToConfig?: () => void;
}

export function UltimosMovimientos({ organizationId, tasaBCV, onGoToConfig }: Props) {
  const [movimientos, setMovimientos] = useState<BancaribeMovimientoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovimientos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/bancaribe/movimientos`);
      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        // No es JSON
      }

      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar los últimos movimientos');
      }
      setMovimientos(data.movimientos || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovimientos();
  }, [organizationId]);

  const isNotConfiguredError = error?.includes('no configurado') || error?.includes('no existe') || error?.includes('schema cache');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-900">Últimas Transacciones</h4>
          <p className="text-xs text-slate-500">Últimos movimientos detectados en tu cuenta Bancaribe</p>
        </div>
        <button
          onClick={fetchMovimientos}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded-xl transition disabled:opacity-50"
          title="Recargar transacciones"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center animate-pulse">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="h-5 bg-slate-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center max-w-md mx-auto">
          {isNotConfiguredError ? (
            <>
              <Layers className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700 mb-1">Integración Bancaribe Inactiva</p>
              <p className="text-xs text-slate-500 mb-4">Para ver las transacciones, primero debes configurar los parámetros comerciales de tu consultorio.</p>
              {onGoToConfig && (
                <button
                  onClick={onGoToConfig}
                  className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-bold transition"
                >
                  Configurar Cuenta Bancaribe
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button
                onClick={fetchMovimientos}
                className="text-xs text-teal-600 hover:underline font-semibold"
              >
                Intentar nuevamente
              </button>
            </>
          )}
        </div>
      ) : movimientos.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No se encontraron movimientos recientes.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-6 py-3.5">Detalle</th>
                <th className="px-6 py-3.5">Método</th>
                <th className="px-6 py-3.5">Banco / Origen</th>
                <th className="px-6 py-3.5">Referencia</th>
                <th className="px-6 py-3.5 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movimientos.map((mov, index) => {
                const isCredit = mov.signo === 'C';
                return (
                  <tr key={index} className="hover:bg-slate-50/50 transition">
                    {/* Detalle */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 leading-tight">
                            {mov.descripcion}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(mov.fecha).toLocaleDateString('es-VE')} • {mov.hora}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Método */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Smartphone className="w-3 h-3 text-slate-500" />
                        {mov.tipo}
                      </span>
                    </td>

                    {/* Banco / Origen */}
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-slate-950 truncate max-w-[150px]">
                        {mov.banco}
                      </p>
                      {mov.telefono && (
                        <p className="text-[10px] text-slate-400">{mov.telefono}</p>
                      )}
                    </td>

                    {/* Referencia */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-600 font-medium">
                        {mov.referencia}
                      </span>
                    </td>

                    {/* Monto */}
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-sm font-bold ${
                          isCredit ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {isCredit ? '+' : '-'} Bs. {mov.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                      {tasaBCV && (
                        <p className="text-[10px] text-slate-400">
                          ≈ ${(mov.monto / tasaBCV).toFixed(2)} USD
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UltimosMovimientos;
