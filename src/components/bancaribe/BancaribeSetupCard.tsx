'use client';

import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

interface Props {
  organizationId: string;
  onSaveSuccess?: () => void;
}

export function BancaribeSetupCard({ organizationId, onSaveSuccess }: Props) {
  const [rif, setRif] = useState('');
  const [cuenta, setCuenta] = useState('');
  const [telefono, setTelefono] = useState('');
  const [hash, setHash] = useState('');
  const [notifActivas, setNotifActivas] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState(false);
  const [isSandbox, setIsSandbox] = useState(true);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setFetching(true);
        const res = await fetch('/api/bancaribe/config');
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setRif(data.config.rif || '');
            setCuenta(data.config.cuenta_bancaribe || '');
            setTelefono(data.config.telefono_comercio || '');
            setHash(data.config.hash_cliente || '');
            setNotifActivas(!!data.config.notificaciones_activas);
            setWebhookConfig(!!data.config.webhook_configurado);
            setIsSandbox(!!data.config.is_sandbox);
          }
        }
      } catch (err) {
        console.error('Error cargando configuración Bancaribe:', err);
      } finally {
        setFetching(false);
      }
    };

    fetchConfig();
  }, [organizationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rif || !cuenta || !telefono) {
      setError('Por favor completa los campos RIF, cuenta y teléfono de comercio.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const res = await fetch('/api/bancaribe/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rif,
          cuenta_bancaribe: cuenta,
          telefono_comercio: telefono,
          hash_cliente: hash,
          notificaciones_activas: notifActivas,
          webhook_configurado: webhookConfig,
          is_sandbox: isSandbox,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la configuración');
      }

      setSuccess(true);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error guardando la configuración.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex justify-center items-center h-48">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900">Configuración Bancaribe BaaS</h4>
          <p className="text-xs text-slate-500">Configura tus credenciales y números afiliados para la automatización financiera</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 flex items-center gap-2 text-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Configuración guardada exitosamente y sincronizada con el banco.</span>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center gap-2 text-xs">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* RIF y Teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              RIF del Consultorio / Médico
            </label>
            <input
              type="text"
              placeholder="J-12345678-9"
              value={rif}
              onChange={(e) => setRif(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Teléfono de Comercio Afiliado
            </label>
            <input
              type="text"
              placeholder="04168327199"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition"
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Cuenta Bancaria */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Cuenta Bancaribe Principal (20 dígitos)
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

        {/* Hash Cliente */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            Hash Cliente (Entregado por el banco)
          </label>
          <input
            type="password"
            placeholder="••••••••••••••••"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 transition font-mono"
            disabled={loading}
          />
        </div>

        {/* Checkboxes / Toggles */}
        <div className="space-y-3 pt-2">
          {/* Sandbox Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSandbox}
              onChange={(e) => setIsSandbox(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
              disabled={loading}
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800">Modo Sandbox (Pruebas)</span>
              <p className="text-slate-400 font-normal">Utiliza credenciales de desarrollo y datos ficticios simulados</p>
            </div>
          </label>

          {/* Notificaciones Activas */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notifActivas}
              onChange={(e) => setNotifActivas(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
              disabled={loading}
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800">Recibir Notificaciones Automáticas</span>
              <p className="text-slate-400 font-normal">Habilita la conciliación en tiempo real cuando entren transacciones</p>
            </div>
          </label>

          {/* Webhook Configurado */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={webhookConfig}
              onChange={(e) => setWebhookConfig(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
              disabled={loading}
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800">Webhook Vinculado</span>
              <p className="text-slate-400 font-normal">Confirma que registraste la URL del webhook en el portal de Bancaribe</p>
            </div>
          </label>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>{loading ? 'Guardando...' : 'Guardar y Validar Conexión'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default BancaribeSetupCard;
