'use client';

import React, { useState } from 'react';
import { Smartphone, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  organizationId: string;
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

export function CobrarPacienteC2P({ organizationId }: Props) {
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

      const res = await fetch(`/api/bancaribe/cobro-c2p`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          monto: Number(monto),
          telefonoPaciente: cleanedPhone,
          bancoPaciente: banco,
          cedulaPaciente: fullCedula,
          conceptoCita: concepto,
        }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || 'Error al procesar el cobro C2P');
      }

      setSuccessData(responseData);
      // Limpiar formulario
      setMonto('');
      setTelefono('');
      setBanco('');
      setCedula('');
      setConcepto('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
          <Smartphone className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900">Cobro Directo C2P</h4>
          <p className="text-xs text-slate-500">Solicita un pago móvil directo al paciente en tiempo real</p>
        </div>
      </div>

      {successData && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-sm">¡Solicitud Procesada!</span>
          </div>
          <p className="text-xs">El cobro ha sido enviado. El paciente debe aprobar la solicitud en su banca digital.</p>
          {successData.Envelope?.Body?.registrarPagoC2pApiResponse?.out?.secuencial && (
            <p className="text-xs font-mono">
              Secuencial: {successData.Envelope.Body.registrarPagoC2pApiResponse.out.secuencial}
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
              Concepto del cobro
            </label>
            <input
              type="text"
              placeholder="Ej. Consulta cardiológica - Dr. Pérez"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Monto a cobrar (Bs.)
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

        {/* Cédula y Banco */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Cédula del paciente
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
              Banco del paciente
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

        {/* Teléfono */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Teléfono del paciente (Pago Móvil)
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
            <Smartphone className="w-4 h-4" />
          )}
          <span>{loading ? 'Procesando cobro...' : 'Generar Cobro C2P'}</span>
        </button>
      </form>
    </div>
  );
}

export default CobrarPacienteC2P;
