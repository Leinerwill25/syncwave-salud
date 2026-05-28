'use client';

import React, { useState } from 'react';
import { Landmark, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  organizationId: string;
  defaultCuentaOrigen: string;
  hashCliente: string;
}

export function TransferenciaInmediata({ organizationId, defaultCuentaOrigen, hashCliente }: Props) {
  const [monto, setMonto] = useState('');
  const [cuenta, setCuenta] = useState('');
  const [cedula, setCedula] = useState('');
  const [cedulaPref, setCedulaPref] = useState('V');
  const [concepto, setConcepto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || !cuenta || !cedula || !concepto) {
      setError('Por favor completa todos los campos.');
      return;
    }

    const cleanedCuenta = cuenta.replace(/\D/g, '');
    if (cleanedCuenta.length !== 20) {
      setError('La cuenta bancaria debe poseer exactamente 20 dígitos numéricos.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessData(null);

      const fullCedula = `${cedulaPref}${cedula.replace(/\D/g, '')}`;
      const destBankCode = cleanedCuenta.substring(0, 4);

      const res = await fetch(`/api/bancaribe/transferencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monto: String(monto),
          bancoDestino: destBankCode,
          cuentaOrigen: defaultCuentaOrigen,
          hash: hashCliente,
          cedulaBeneficiario: fullCedula,
          concepto,
          tipoCuenta: 'CNTA',
        }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || 'Error al procesar la transferencia');
      }

      setSuccessData(responseData);
      setMonto('');
      setCuenta('');
      setCedula('');
      setConcepto('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error procesando la transferencia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900">Transferencia Inmediata</h4>
          <p className="text-xs text-slate-500">Realiza una transferencia bancaria a cualquier cuenta de 20 dígitos</p>
        </div>
      </div>

      {successData && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-sm">¡Transferencia Exitosa!</span>
          </div>
          <p className="text-xs">La transferencia bancaria se ha liquidado correctamente.</p>
          {successData.Envelope?.Body?.CredInmediatoApiResponse?.out?.secuencial && (
            <p className="text-xs font-mono">
              Secuencial: {successData.Envelope.Body.CredInmediatoApiResponse.out.secuencial}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center gap-2 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Concepto y Monto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Concepto
            </label>
            <input
              type="text"
              placeholder="Ej. Pago a proveedor médico S.A."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Monto (Bs.)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Cuenta Destino */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Número de Cuenta Destino (20 dígitos)
          </label>
          <input
            type="text"
            placeholder="01140000000000000001"
            value={cuenta}
            onChange={(e) => setCuenta(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition font-mono"
            disabled={loading}
            maxLength={20}
            required
          />
        </div>

        {/* Cédula/RIF Beneficiario */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Cédula o RIF del Beneficiario
          </label>
          <div className="flex gap-1.5">
            <select
              value={cedulaPref}
              onChange={(e) => setCedulaPref(e.target.value)}
              className="px-2 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"
              disabled={loading}
            >
              <option value="V">V</option>
              <option value="E">E</option>
              <option value="J">J</option>
              <option value="G">G</option>
            </select>
            <input
              type="text"
              placeholder="12345678 o 310000000"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Landmark className="w-4 h-4" />
          )}
          <span>{loading ? 'Transfiriendo...' : 'Realizar Transferencia'}</span>
        </button>
      </form>
    </div>
  );
}

export default TransferenciaInmediata;
