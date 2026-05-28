'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Landmark, ArrowUpRight, TrendingUp, HelpCircle, FileText, Smartphone, Settings } from 'lucide-react';
import { SaldoDisponible } from './SaldoDisponible';
import { TasaBCV } from './TasaBCV';
import { UltimosMovimientos } from './UltimosMovimientos';
import { ExtractoBancario } from './ExtractoBancario';
import { CobrarPacienteC2P } from './CobrarPacienteC2P';
import { PagoAPersonas } from './PagoAPersonas';
import { TransferenciaInmediata } from './TransferenciaInmediata';
import { BancaribeSetupCard } from './BancaribeSetupCard';

interface Props {
  organizationId: string;
  orgName: string;
}

export function DashboardFinanciero({ organizationId, orgName }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'statement' | 'ops' | 'config'>('overview');
  const [tasaBCV, setTasaBCV] = useState<number | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [loadingSaldo, setLoadingSaldo] = useState(true);
  const [loadingTasa, setLoadingTasa] = useState(true);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  
  // RIF y teléfono del consultorio configurados
  const [rif, setRif] = useState('');
  const [telefono, setTelefono] = useState('');
  const [hash, setHash] = useState('');

  const loadExchangeRate = async () => {
    try {
      setLoadingTasa(true);
      const res = await fetch('/api/currency/rate?code=USD');
      if (res.ok) {
        const data = await res.json();
        if (data.rate?.rate) {
          setTasaBCV(Number(data.rate.rate));
        }
      }
    } catch (err) {
      console.error('Error al cargar tasa BCV:', err);
    } finally {
      setLoadingTasa(false);
    }
  };

  const loadConfig = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/bancaribe/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setRif(data.config.rif || '');
          setTelefono(data.config.telefono_comercio || '');
          setHash(data.config.hash_cliente || '');
          setIsConfigured(true);
          return true;
        }
      }
      setIsConfigured(false);
      return false;
    } catch (err) {
      console.error('Error al cargar RIF/Teléfono:', err);
      setIsConfigured(false);
      return false;
    }
  };

  const loadBalance = useCallback(async () => {
    try {
      setLoadingSaldo(true);
      const res = await fetch(`/api/bancaribe/saldo?orgId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.saldo?.disponible !== undefined) {
          setSaldo(Number(data.saldo.disponible));
        }
      }
    } catch (err) {
      console.error('Error al cargar saldo:', err);
    } finally {
      setLoadingSaldo(false);
    }
  }, [organizationId]);

  const initData = useCallback(async () => {
    const isConfig = await loadConfig();
    await loadExchangeRate();
    if (isConfig) {
      await loadBalance();
    } else {
      setLoadingSaldo(false);
    }
  }, [loadBalance]);

  useEffect(() => {
    initData();
  }, [initData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-teal-600" />
            <span>Panel Financiero Bancaribe BaaS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de ingresos, egresos y conciliación automática del consultorio <strong>{orgName}</strong>
          </p>
        </div>
        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-center">
          Open Banking Certificado
        </span>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          Resumen General
        </button>
        <button
          onClick={() => setActiveTab('statement')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            activeTab === 'statement'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          Estado de Cuenta
        </button>
        <button
          onClick={() => setActiveTab('ops')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            activeTab === 'ops'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          Cobros y Pagos
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          Configuración
        </button>
      </div>

      {/* Tab Panels */}
      {isConfigured === null ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Cargando contexto financiero...</p>
        </div>
      ) : isConfigured === false && activeTab !== 'config' ? (
        /* Pantalla de Onboarding Premium */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-semibold text-teal-700">
              <Landmark className="w-3.5 h-3.5" />
              <span>Bancaribe Open Banking BaaS</span>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Simplifica la gestión de tus pagos médicos
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Conecta tu consultorio con los servicios de banca abierta de Bancaribe para habilitar cobros instantáneos C2P, automatizar la conciliación de citas médicas y emitir transferencias en tiempo real sin salir de ASHIRA.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Cobro Móvil C2P Automático</h5>
                  <p className="text-[11px] text-slate-500">Los pacientes pagan desde su banco emisor y la cita se confirma al instante.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Conciliación Sin Fraudes</h5>
                  <p className="text-[11px] text-slate-500">Adiós a las capturas de pantalla falsas. El webhook del banco valida cada transacción.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Pago a Personas e Inmediato</h5>
                  <p className="text-[11px] text-slate-500">Envía honorarios profesionales por pago móvil y realiza transferencias a terceros.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Auditoría y Extractos</h5>
                  <p className="text-[11px] text-slate-500">Descarga extractos bancarios paginados y monitorea balances VES/USD.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setActiveTab('config')}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-teal-600/10 inline-flex items-center gap-2 group"
              >
                <span>Configurar e Integrar Cuenta</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </button>
            </div>
          </div>
          
          <div className="w-full max-w-[280px] md:max-w-[340px] flex-shrink-0 bg-slate-50 rounded-3xl border border-slate-100 p-6 flex flex-col justify-between aspect-square relative shadow-inner">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full filter blur-xl" />
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md shadow-teal-600/20">
                A
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-lg shadow-sm">
                Sandbox Mode
              </span>
            </div>
            
            <div className="space-y-2">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Balance Corporativo</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Bs. 0,00</h3>
              <p className="text-[11px] font-semibold text-emerald-600">≈ $0.00 USD</p>
            </div>

            <div className="border-t border-slate-200/80 pt-4 flex items-center gap-3">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <Settings className="w-4 h-4 animate-spin-slow" />
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Integración pendiente de activación. Configure sus credenciales para habilitar.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Paneles de Contenido Normal cuando está Configurado */
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Widgets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SaldoDisponible
                  saldo={saldo}
                  loading={loadingSaldo}
                  tasaBCV={tasaBCV}
                  onRefresh={loadBalance}
                />
                <TasaBCV tasaBCV={tasaBCV} loading={loadingTasa} />
                <PagosHoyCard organizationId={organizationId} />
              </div>

              {/* Últimos movimientos */}
              <UltimosMovimientos organizationId={organizationId} tasaBCV={tasaBCV} onGoToConfig={() => setActiveTab('config')} />
            </div>
          )}

          {activeTab === 'statement' && (
            <div className="space-y-6">
              <ExtractoBancario organizationId={organizationId} />
            </div>
          )}

          {activeTab === 'ops' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulario Cobro Paciente C2P */}
              <CobrarPacienteC2P organizationId={organizationId} />

              {/* Formularios de Salida (Transferencias y Pagos a Profesionales) */}
              <div className="space-y-6">
                <PagoAPersonas
                  organizationId={organizationId}
                  defaultRif={rif}
                  defaultPhone={telefono}
                  defaultName={orgName}
                />
                <TransferenciaInmediata
                  organizationId={organizationId}
                  defaultCuentaOrigen={rif ? '01140000000000000001' : ''} // Cuenta origen demo o cargada
                  hashCliente={hash}
                />
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'config' && (
        <div className="max-w-2xl">
          <BancaribeSetupCard organizationId={organizationId} onSaveSuccess={initData} />
        </div>
      )}
    </div>
  );
}

function PagosHoyCard({ organizationId }: { organizationId: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bancaribe/pagos-hoy?orgId=${organizationId}`)
      .then(r => r.json())
      .then(data => {
        setCount(data.count ?? 0);
        setTotal(data.total ?? 0);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [organizationId]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
          <TrendingUp className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Ingresos Hoy
        </span>
      </div>

      <p className="text-sm font-medium text-slate-500 mb-1">Pagos recibidos hoy</p>
      
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-3/4" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-1/2" />
        </div>
      ) : (
        <>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {count ?? 0} {count === 1 ? 'pago' : 'pagos'}
          </h3>
          <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Total: Bs. {total?.toLocaleString('es-VE', { minimumFractionDigits: 2 }) || '0,00'}</span>
          </p>
        </>
      )}
    </div>
  );
}

export default DashboardFinanciero;
