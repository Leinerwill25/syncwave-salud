'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, ArrowLeft, ArrowRight, FileSpreadsheet, Activity } from 'lucide-react';
import type { BancaribeExtractoItem } from '@/lib/bancaribe/types';

interface Props {
  organizationId: string;
}

export function ExtractoBancario({ organizationId }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [from, setFrom] = useState(firstDayOfMonth);
  const [to, setTo] = useState(today);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [data, setData] = useState<BancaribeExtractoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExtracto = async (pageNum = page) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/bancaribe/extracto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          page: pageNum,
          limit,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al consultar extracto bancario');
      }

      const resData = await res.json();
      setData(resData.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error consultando extracto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtracto(1);
    setPage(1);
  }, [from, to]);

  const handlePageChange = (direction: 'next' | 'prev') => {
    const newPage = direction === 'next' ? page + 1 : Math.max(1, page - 1);
    setPage(newPage);
    fetchExtracto(newPage);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header & Filters */}
      <div className="p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-slate-900">Estado de Cuenta Completo</h4>
            <p className="text-xs text-slate-500">Conciliación de saldos y créditos filtrados por rango de fechas</p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Desde
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Hasta
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
              />
            </div>
          </div>
          <div>
            <button
              onClick={() => fetchExtracto(page)}
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Consultar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <div className="p-12 space-y-4">
          <div className="h-6 bg-slate-100 rounded animate-pulse w-full" />
          <div className="h-6 bg-slate-100 rounded animate-pulse w-full" />
          <div className="h-6 bg-slate-100 rounded animate-pulse w-full" />
        </div>
      ) : error ? (
        <div className="p-12 text-center text-red-500">
          <p className="text-sm">{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No se registraron movimientos en el rango de fechas seleccionado.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-3.5">Fecha</th>
                  <th className="px-6 py-3.5">Concepto</th>
                  <th className="px-6 py-3.5">Banco Origen</th>
                  <th className="px-6 py-3.5">Referencia</th>
                  <th className="px-6 py-3.5">Flujo</th>
                  <th className="px-6 py-3.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => {
                  const isIncome = item.txnFlow === 'Ingreso';
                  return (
                    <tr key={item.txnId} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {item.txnDate}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-semibold text-slate-900">
                        {item.txnConcept}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        {item.txnOriginBankName}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-mono text-slate-500">
                        {item.txnRefPrimary}
                      </td>
                      <td className="px-6 py-3.5 text-xs">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.txnFlow}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs font-bold text-slate-900 text-right">
                        Bs. {item.txnAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Página {page}</span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={page === 1 || loading}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-600 disabled:opacity-50 transition flex items-center gap-1.5 text-xs font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Anterior
              </button>
              <button
                onClick={() => handlePageChange('next')}
                disabled={data.length < limit || loading}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-600 disabled:opacity-50 transition flex items-center gap-1.5 text-xs font-medium"
              >
                Siguiente
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ExtractoBancario;
