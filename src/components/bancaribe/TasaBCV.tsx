'use client';

import React from 'react';
import { DollarSign, ArrowUpRight } from 'lucide-react';

interface Props {
  tasaBCV: number | null;
  loading: boolean;
}

export function TasaBCV({ tasaBCV, loading }: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
      {/* Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
          <DollarSign className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
          BCV Oficial
        </span>
      </div>

      <p className="text-sm font-medium text-slate-500 mb-1">Tasa de cambio del día</p>
      
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-3/4" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-1/2" />
        </div>
      ) : (
        <>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-baseline gap-1">
            {tasaBCV ? (
              <>
                <span>Bs. {tasaBCV.toFixed(2)}</span>
                <span className="text-xs text-slate-400 font-normal">/ USD</span>
              </>
            ) : (
              'Cargando...'
            )}
          </h3>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-teal-500" />
            <span>Actualizado automáticamente por ASHIRA</span>
          </p>
        </>
      )}
    </div>
  );
}

export default TasaBCV;
