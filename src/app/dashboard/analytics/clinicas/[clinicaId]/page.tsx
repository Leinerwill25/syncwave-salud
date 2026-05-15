'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Calendar, TrendingUp, Users, CalendarCheck, 
  UserPlus, Download, Loader2, Activity, CreditCard, AlertTriangle, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWeekRange } from '@/lib/analytics/queries';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toPng } from 'html-to-image';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function CorporateClinicaDetailAnalytics({ params }: { params: Promise<{ clinicaId: string }> }) {
  const router = useRouter();
  const clinicaId = use(params).clinicaId;

  const [weeksAgo, setWeeksAgo] = useState(0);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen');
  const [capturing, setCapturing] = useState(false);
  
  // Trends State
  const [trendMonths, setTrendMonths] = useState(6);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // LTV & AI State
  const [ltvData, setLtvData] = useState<any>(null);
  const [isLoadingLtv, setIsLoadingLtv] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const { from, to } = getWeekRange(weeksAgo);
  const weekLabel = `${format(from, "d MMM", { locale: es })} - ${format(to, "d MMM, yyyy", { locale: es })}`;

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/analytics/clinicas/${clinicaId}?week=${weeksAgo}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
      });
  }, [clinicaId, weeksAgo]);

  useEffect(() => {
    setIsLoadingLtv(true);
    fetch(`/api/analytics/clinicas/${clinicaId}?type=ltv`)
      .then(res => res.json())
      .then(d => {
        setLtvData(d);
        setIsLoadingLtv(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoadingLtv(false);
      });
  }, [clinicaId]);

  useEffect(() => {
    setIsLoadingAi(true);
    fetch(`/api/analytics/clinicas/${clinicaId}/ai-insights`)
      .then(res => res.json())
      .then(d => {
        if (d.success) setAiRecommendations(d.recommendations);
        setIsLoadingAi(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoadingAi(false);
      });
  }, [clinicaId]);

  useEffect(() => {
    setIsLoadingTrends(true);
    fetch(`/api/analytics/clinicas/${clinicaId}?type=trends&months=${trendMonths}`)
      .then(res => res.json())
      .then(d => {
        setTrendsData(d);
        setIsLoadingTrends(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoadingTrends(false);
      });
  }, [clinicaId, trendMonths]);

  const handleCapture = async () => {
    setCapturing(true);
    try {
      const element = document.getElementById('analytics-dashboard');
      if (!element) return;
      const dataUrl = await toPng(element, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Reporte_${clinicaId}_${weekLabel}.png`;
      link.click();
    } catch (err) {
      console.error("Error al capturar el informe:", err);
    } finally {
      setCapturing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "tween", ease: "easeOut", duration: 0.3 } }
  } as const;

  if (isLoading && !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Cargando métricas corporativas...</p>
        </div>
      </div>
    );
  }

  const m = data?.metricas || { totalCitas: 0, confirmadas: 0, noAsistio: 0, noRespondieron: 0, tasaConfirmacion: 0, revenue: 0, revenueVes: 0, baseCurrency: 'USD', pacientesNuevos: 0 };
  const pctConfirmadas = m.totalCitas ? (m.confirmadas / m.totalCitas) * 100 : 0;
  const pctNoAsistio = m.totalCitas ? (m.noAsistio / m.totalCitas) * 100 : 0;
  
  const currencySymbol = m.baseCurrency === 'EUR' ? '€' : m.baseCurrency === 'VES' ? 'Bs.' : '$';

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8 font-sans selection:bg-slate-100 selection:text-slate-900 pb-24 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/analytics/clinicas')} className="rounded-md hover:bg-slate-50 border-slate-200">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Análisis de Rendimiento
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                <Calendar className="w-4 h-4" /> 
                <span>{weekLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex items-center bg-slate-50 p-1 rounded-md border border-slate-200">
              <Button variant="ghost" size="icon" className="rounded-sm hover:bg-white transition-colors h-8 w-8" onClick={() => setWeeksAgo(p => p + 1)}>
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </Button>
              <span className="text-sm font-medium px-4 text-slate-700 whitespace-nowrap">
                {weeksAgo === 0 ? 'Semana Actual' : `Hace ${weeksAgo} sem`}
              </span>
              <Button variant="ghost" size="icon" className="rounded-sm hover:bg-white transition-colors h-8 w-8" onClick={() => setWeeksAgo(p => Math.max(0, p - 1))} disabled={weeksAgo === 0}>
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </Button>
            </div>
            
            <Button onClick={handleCapture} disabled={capturing} className="bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-none border-0 gap-2 font-medium px-5">
              {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Descargar Reporte Gerencial
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div id="analytics-dashboard" className="space-y-6 bg-white pt-2">
          
          {/* KPI Cards */}
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <motion.div variants={itemVariants} className="bg-white p-5 rounded-lg border-l-4 border-l-blue-500 border-y border-r border-slate-200 shadow-sm hover:shadow transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500">Total Citas</h3>
                <div className="p-2 bg-blue-50 rounded-full">
                  <CalendarCheck className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-slate-900">{m.totalCitas}</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white p-5 rounded-lg border-l-4 border-l-emerald-500 border-y border-r border-slate-200 shadow-sm hover:shadow transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500">Ingresos (Facturado)</h3>
                <div className="p-2 bg-emerald-50 rounded-full">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-medium text-slate-400">{currencySymbol}</span>
                <span className="text-3xl font-semibold text-slate-900">{m.revenue.toFixed(2)}</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white p-5 rounded-lg border-l-4 border-l-violet-500 border-y border-r border-slate-200 shadow-sm hover:shadow transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500">Tasa de Asistencia</h3>
                <div className="p-2 bg-violet-50 rounded-full">
                  <Users className="w-4 h-4 text-violet-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-slate-900">{m.tasaConfirmacion}</span>
                <span className="text-lg font-medium text-slate-400">%</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-lg border-l-4 border-l-indigo-500 border-y border-r border-indigo-100 shadow-sm hover:shadow transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-indigo-700">Nuevos Pacientes</h3>
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-slate-900">+{m.pacientesNuevos}</span>
              </div>
            </motion.div>

            {/* Card 5: Costo de Ausencias */}
            <motion.div variants={itemVariants} className="bg-white p-5 rounded-lg border-l-4 border-l-red-500 border-y border-r border-slate-200 shadow-sm hover:shadow transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500">Costo de Ausencias</h3>
                <div className="p-2 bg-red-50 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-medium text-slate-400">{currencySymbol}</span>
                <span className="text-3xl font-semibold text-red-600">{m.costOfAbsences?.toFixed(2) || '0.00'}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Potencial perdido esta semana</p>
            </motion.div>

            {/* Card 6: Índice de Salud */}
            <motion.div variants={itemVariants} className="bg-gradient-to-br from-amber-50 to-white p-5 rounded-lg border-l-4 border-l-amber-500 border-y border-r border-amber-100 shadow-sm hover:shadow transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-amber-700">Índice de Salud</h3>
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <Activity className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-slate-900">{Math.min(100, Math.round((m.tasaConfirmacion * 0.5) + (Math.min(m.pacientesNuevos * 5, 25)) + (m.totalCitas > 0 ? 25 : 0)))}</span>
                <span className="text-lg font-medium text-slate-400">/100</span>
              </div>
            </motion.div>

          </motion.div>

          {/* Details Section */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Custom Tabs */}
            <div className="flex overflow-x-auto px-2 pt-2 gap-1 bg-slate-50 border-b border-slate-200 no-scrollbar">
              {[
                { id: 'resumen', label: 'Rendimiento', icon: Activity },
                { id: 'citas', label: 'Agenda de Citas', icon: CalendarCheck },
                { id: 'revenue', label: 'Desglose Financiero', icon: CreditCard },
                { id: 'tendencias', label: 'Tendencias y Comportamiento', icon: TrendingUp },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-t-md font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-white text-blue-700 border-t-2 border-t-blue-600 border-l border-r border-slate-200 -mb-px relative z-10' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-t-2 border-transparent border-l border-r'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : ''}`} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 min-h-[400px]">
              <AnimatePresence mode="wait">
                
                {activeTab === 'resumen' && (
                  <motion.div key="resumen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                    
                    {/* AI Card */}
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-lg p-5 border border-violet-100 shadow-sm">
                      <h3 className="text-base font-semibold text-violet-900 mb-3 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-violet-600" />
                        Asesor IA ASHIRA · Recomendaciones Gerenciales
                      </h3>
                      {isLoadingAi ? (
                        <div className="flex items-center gap-2 text-violet-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generando recomendaciones...
                        </div>
                      ) : aiRecommendations.length > 0 ? (
                        <ul className="space-y-2">
                          {aiRecommendations.map((rec, idx) => (
                            <li key={idx} className="flex gap-2 text-sm text-slate-700">
                              <span className="text-violet-600 font-bold">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">No hay recomendaciones disponibles para este periodo.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Asistencia */}
                      <div className="bg-white rounded-md p-6 border border-slate-200">
                        <h3 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
                          Métricas de Asistencia
                        </h3>
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-600">Asistencias Exitosas</span>
                              <span className="font-medium text-emerald-600">{m.confirmadas}</span>
                            </div>
                            <Progress value={pctConfirmadas} className="h-2 bg-slate-100 [&>div]:bg-emerald-500" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-600">Ausencias / Cancelaciones</span>
                              <span className="font-medium text-red-500">{m.noAsistio}</span>
                            </div>
                            <Progress value={pctNoAsistio} className="h-2 bg-slate-100 [&>div]:bg-red-400" />
                          </div>
                        </div>
                      </div>

                      {/* Info adicional */}
                      <div className="bg-gradient-to-b from-blue-50/50 to-indigo-50/50 rounded-md p-6 border border-blue-100 flex flex-col justify-center shadow-sm">
                        <h4 className="font-semibold text-blue-900 text-base mb-3">Resumen Financiero</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-blue-200/60">
                            <span className="text-sm text-slate-600">Total Citas Gestionadas</span>
                            <span className="text-sm font-medium text-slate-900">{m.totalCitas}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-blue-200/60">
                            <span className="text-sm text-slate-600">Tasa de Éxito</span>
                            <span className="text-sm font-medium text-emerald-600">{m.tasaConfirmacion}%</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-blue-200/60">
                            <span className="text-sm text-slate-600">Ingreso Facturado ({m.baseCurrency || 'Divisa'})</span>
                            <span className="text-sm font-bold text-blue-700">{currencySymbol}{m.revenue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-slate-600">Ingreso en Bolívares (Tasa del Día)</span>
                            <span className="text-sm font-bold text-emerald-600">Bs. {(m.revenueVes || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top 10 Patients (LTV) */}
                    <div className="mt-6 bg-white rounded-md p-6 border border-slate-200">
                      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        Top 10 Pacientes más Valiosos (LTV)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3">Paciente</th>
                              <th className="px-4 py-3">Identificación</th>
                              <th className="px-4 py-3">LTV (Ingresos)</th>
                              <th className="px-4 py-3">Fidelidad</th>
                              <th className="px-4 py-3">Segmento</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {isLoadingLtv ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-3 text-center text-slate-500">
                                  <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Cargando ranking...
                                  </div>
                                </td>
                              </tr>
                            ) : ltvData?.length > 0 ? (
                              ltvData.map((p: any) => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                                  <td className="px-4 py-3">{p.identification || 'N/A'}</td>
                                  <td className="px-4 py-3 text-emerald-600 font-bold">{currencySymbol}{p.ltv.toFixed(2)}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <Progress value={p.score} className="h-1.5 w-16 bg-slate-100 [&>div]:bg-blue-500" />
                                      <span className="text-xs font-medium">{p.score}/100</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge className={`font-medium px-2 py-0.5 rounded-md ${
                                      p.segment === 'Fiel' ? 'bg-emerald-100 text-emerald-700' :
                                      p.segment === 'En riesgo' ? 'bg-amber-100 text-amber-700' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {p.segment}
                                    </Badge>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-4 py-3 text-center text-slate-500">No hay datos suficientes para generar el ranking.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB: CITAS */}
                {activeTab === 'citas' && (
                  <motion.div key="citas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="overflow-x-auto rounded-md border border-slate-200">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3">Fecha y Hora</th>
                            <th className="px-5 py-3">Paciente</th>
                            <th className="px-5 py-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(data?.citas || []).map((cita: any) => (
                            <tr key={cita.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3 text-slate-800">{format(new Date(cita.date), 'dd MMM, HH:mm')}</td>
                              <td className="px-5 py-3">{cita.patient?.full_name || 'Desconocido'}</td>
                              <td className="px-5 py-3">
                                <Badge className={`font-medium px-2 py-0.5 rounded-md ${
                                  ['COMPLETADA', 'CONFIRMADA', 'COMPLETED', 'REALIZADA'].includes(cita.status) 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : ['NO ASISTIÓ', 'CANCELADA'].includes(cita.status)
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`} variant="outline">
                                  {cita.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                          {(!data?.citas || data.citas.length === 0) && (
                            <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">No se encontraron registros de citas</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {/* TAB: REVENUE */}
                {activeTab === 'revenue' && (
                  <motion.div key="revenue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="overflow-x-auto rounded-md border border-slate-200 mb-6">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3">Fecha</th>
                            <th className="px-5 py-3">Paciente</th>
                            <th className="px-5 py-3 text-right">Monto Facturado ({currencySymbol})</th>
                            <th className="px-5 py-3 text-right">Monto Facturado (Bs.)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(data?.citas || []).filter((c:any) => c.price !== null && c.price !== undefined).map((cita: any) => (
                            <tr key={cita.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3">{format(new Date(cita.date), 'dd MMM yyyy')}</td>
                              <td className="px-5 py-3 text-slate-800">{cita.patient?.full_name || 'Desconocido'}</td>
                              <td className="px-5 py-3 text-right font-medium text-emerald-600">{currencySymbol}{Number(cita.price).toFixed(2)}</td>
                              <td className="px-5 py-3 text-right font-medium text-slate-600">Bs. {Number(cita.priceVes).toFixed(2)}</td>
                            </tr>
                          ))}
                          {(!data?.citas || data.citas.filter((c:any) => c.price !== null).length === 0) && (
                            <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No se encontraron registros de facturación</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end gap-4">
                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-md min-w-[200px] text-right shadow-sm">
                        <p className="text-slate-500 text-sm mb-1 font-medium">Total Bolívares</p>
                        <p className="text-2xl font-bold text-slate-900">Bs. {(m.revenueVes || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-5 rounded-md min-w-[250px] text-right shadow-sm">
                        <p className="text-emerald-700 text-sm mb-1 font-medium">Total Ingresos ({m.baseCurrency || 'Divisa'})</p>
                        <p className="text-2xl font-bold text-emerald-600">{currencySymbol}{m.revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB: TENDENCIAS Y COMPORTAMIENTO */}
                {activeTab === 'tendencias' && (
                  <motion.div key="tendencias" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-8">
                    
                    {/* Header Controls for Trends */}
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-slate-500" />
                        Inteligencia de Negocios (BI)
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Período:</span>
                        <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                          <button 
                            onClick={() => setTrendMonths(6)}
                            className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${trendMonths === 6 ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                          >
                            6 Meses
                          </button>
                          <button 
                            onClick={() => setTrendMonths(12)}
                            className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${trendMonths === 12 ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                          >
                            12 Meses
                          </button>
                        </div>
                      </div>
                    </div>

                    {isLoadingTrends || !trendsData ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Monthly Trend Chart */}
                        <div className="bg-white border border-slate-200 p-5 rounded-lg col-span-1 lg:col-span-2">
                          <h4 className="text-sm font-semibold text-slate-800 mb-6">Volumen de Citas Mensual</h4>
                          <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendsData.monthlyTrend || []}>
                                <defs>
                                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                                <RechartsTooltip 
                                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Line type="monotone" name="Total Citas" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6, fill: '#2563eb' }} />
                                <Line type="monotone" name="Completadas" dataKey="completadas" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#ffffff' }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Weekly Trend Chart (Semanas del Mes) */}
                        <div className="bg-white border border-slate-200 p-5 rounded-lg col-span-1 lg:col-span-2">
                          <h4 className="text-sm font-semibold text-slate-800 mb-2">Comportamiento por Semanas del Mes</h4>
                          <p className="text-xs text-slate-500 mb-6">Identifica en qué etapa del mes las pacientes agendan más (consolidado del período actual)</p>
                          <div className="h-[220px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={trendsData.weeklyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="barColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <RechartsTooltip 
                                  cursor={{ fill: '#f8fafc' }}
                                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" name="Total Citas Agendadas" fill="url(#barColor)" radius={[4, 4, 0, 0]} barSize={40} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Top Services */}
                        <div className="bg-white border border-slate-200 p-5 rounded-lg">
                          <h4 className="text-sm font-semibold text-slate-800 mb-6">Servicios Más Solicitados</h4>
                          <div className="h-[220px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={trendsData.topServices || []} layout="vertical" margin={{ left: 40, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} width={120} />
                                <RechartsTooltip 
                                  cursor={{ fill: '#f8fafc' }}
                                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Bar dataKey="value" name="Citas" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Patient Loyalty & Heatmap Summary */}
                        <div className="space-y-6">
                          
                          <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800 mb-1">Fidelización de Pacientes</h4>
                              <p className="text-xs text-slate-500">Proporción de frecuencia</p>
                            </div>
                            <div className="flex gap-6">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-violet-600">{trendsData.loyalty?.recurrentes || 0}</p>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Frecuentes</p>
                              </div>
                              <div className="w-px bg-slate-200"></div>
                              <div className="text-left">
                                <p className="text-2xl font-bold text-blue-500">{trendsData.loyalty?.unicos || 0}</p>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">1ª Vez</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white border border-slate-200 p-5 rounded-lg">
                            <h4 className="text-sm font-semibold text-slate-800 mb-4">Días de Mayor Demanda</h4>
                            <div className="space-y-3">
                              {/* Simple horizontal bars representing heatmap totals by day */}
                              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(day => {
                                const totalDay = (trendsData.heatmap || []).filter((h:any) => h.day === day).reduce((sum:number, h:any) => sum + h.count, 0);
                                const maxDay = Math.max(...['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => 
                                  (trendsData.heatmap || []).filter((h:any) => h.day === d).reduce((sum:number, h:any) => sum + h.count, 0)
                                )) || 1;
                                
                                return (
                                  <div key={day} className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-slate-500 w-16">{day}</span>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                                        style={{ width: `${(totalDay / maxDay) * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700 w-6 text-right">{totalDay}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
                
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
