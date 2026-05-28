'use client';

import React from 'react';
import { Wallet, RefreshCw } from 'lucide-react';

interface Props {
  saldo: number | null;
  loading: boolean;
  tasaBCV: number | null;
  onRefresh: () => void;
}

export function SaldoDisponible({ saldo, loading, tasaBCV, onRefresh }: Props) {
  const saldoUSD = saldo && tasaBCV ? (saldo / tasaBCV).toFixed(2) : null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
      {/* Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
          <Wallet className="w-6 h-6" />
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-slate-400 hover:text-teal-600 transition disabled:opacity-50"
          title="Actualizar saldo"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-sm font-medium text-slate-500 mb-1">Saldo disponible</p>
      
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-3/4" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-1/2" />
        </div>
      ) : (
        <>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {saldo !== null ? (
              `Bs. ${saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
            ) : (
              'No disponible'
            )}
          </h3>
          {saldoUSD !== null && (
            <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <span>≈</span>
              <span>${Number(saldoUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
              <span className="text-[10px] text-slate-400 font-normal">(al cambio oficial)</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default SaldoDisponible;
