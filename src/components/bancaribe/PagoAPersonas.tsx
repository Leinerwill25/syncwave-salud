'use client';

import React, { useState } from 'react';
import { Send, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  organizationId: string;
  defaultRif: string;
  defaultPhone: string;
  defaultName: string;
}

const VEN_BANKS = [
  { code: '0102', name: 'Banco de Venezuela' },
  { code: '0105', name: 'Banco Mercantil' },
  { code: '0108', name: 'BBVA Provincial' },
  { code: '0114', name: 'Bancaribe' },
  { code: '0134', name: 'Banesco' },
  { code: '0172', name: 'Bancamiga' },
  { code: '0191', name: 'BNC' },
];

export function PagoAPersonas({ organizationId, defaultRif, defaultPhone, defaultName }: Props) {
  const [monto, setMonto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [banco, setBanco] = useState('');
  const [cedula, setCedula] = useState('');
  const [cedulaPref, setCedulaPref] = useState('V');
  const [concepto, setConcepto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || !telefono || !banco || !cedula || !concepto) {
      setError('Por favor completa todos los campos.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessData(null);

      const cleanedPhone = telefono.replace(/\D/g, '');
      const fullCedula = `${cedulaPref}${cedula.replace(/\D/g, '')}`;

      const res = await fetch(`/api/bancaribe/pago-personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monto: Number(monto),
          bancoBeneficiario: banco,
          cedulaBeneficiario: fullCedula,
          telefonoBeneficiario: cleanedPhone,
          concepto,
          nombreComercio: defaultName || 'Consultorio',
          rif: defaultRif,
          telefonoOrigen: defaultPhone,
        }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || 'Error al procesar el pago móvil');
      }

      setSuccessData(responseData);
      setMonto('');
      setTelefono('');
      setBanco('');
      setCedula('');
      setConcepto('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error procesando la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
          <Send className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900">Emisión de Pago Móvil (PaP)</h4>
          <p className="text-xs text-slate-500">Envía dinero desde tu cuenta corporativa a cualquier persona natural</p>
        </div>
      </div>

      {successData && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-sm">¡Pago Móvil Enviado!</span>
          </div>
          <p className="text-xs">La transferencia ha sido enviada con éxito al beneficiario.</p>
          {successData.codigoConfirmacion && (
            <p className="text-xs font-mono">Confirmación: {successData.codigoConfirmacion}</p>
          )}
          {successData.secuencial && (
            <p className="text-xs font-mono">Secuencial: {successData.secuencial}</p>
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
              Concepto del pago / honorarios
            </label>
            <input
              type="text"
              placeholder="Ej. Pago honorarios médicos Dra. López"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Monto a enviar (Bs.)
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

        {/* Cédula y Banco Beneficiario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Cédula del beneficiario
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
              </select>
              <input
                type="text"
                placeholder="12345678"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
                disabled={loading}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Banco del beneficiario
            </label>
            <select
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
              disabled={loading}
              required
            >
              <option value="">Selecciona un banco</option>
              {VEN_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Teléfono Beneficiario */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Teléfono del beneficiario (Pago Móvil)
          </label>
          <input
            type="text"
            placeholder="04123456789"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
            disabled={loading}
            required
          />
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
            <Send className="w-4 h-4" />
          )}
          <span>{loading ? 'Transmitiendo pago...' : 'Enviar Pago Móvil'}</span>
        </button>
      </form>
    </div>
  );
}

export default PagoAPersonas;
