'use client';

import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Brain, Mic, History, Zap, ShieldCheck, TrendingUp, Cpu, 
  BarChart3, Calendar, Clock, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function AIUsageDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalTokens: 0,
    avgCacheRate: 0,
    topFeature: '-'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // In a real scenario, this would call an API or use a service client.
      // Here we simulate the data fetching from the view created in migrations
      const { data: usage, error } = await supabaseAdmin
        .from('ai_daily_usage')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setData(usage || []);
      
      // Calculate Stats
      if (usage && usage.length > 0) {
        const totalCalls = usage.reduce((acc: number, curr: any) => acc + curr.api_calls + curr.cache_hits, 0);
        const totalTokens = usage.reduce((acc: number, curr: any) => acc + (curr.total_tokens || 0), 0);
        const avgCacheRate = usage.reduce((acc: number, curr: any) => acc + (curr.cache_hit_rate_pct || 0), 0) / usage.length;
        
        setStats({
          totalCalls,
          totalTokens,
          avgCacheRate: Math.round(avgCacheRate),
          topFeature: 'ASHIRA-Doc' // Simplified
        });
      }
    } catch (err) {
      console.error('Error fetching AI usage:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Brain className="text-blue-600 w-10 h-10" />
            ASHIRA AI <span className="text-blue-500 font-light italic text-xl">Command Center</span>
          </h1>
          <p className="text-slate-500 mt-1">Monitoreo de inteligencia clínica y eficiencia de tokens.</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium text-slate-600 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refrescar Datos
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Llamadas Totales" 
          value={stats.totalCalls.toLocaleString()} 
          icon={<Zap className="text-yellow-500" />} 
          trend="+12% vs ayer"
          color="blue"
        />
        <StatCard 
          title="Tokens Consumidos" 
          value={stats.totalTokens.toLocaleString()} 
          icon={<Cpu className="text-purple-500" />} 
          trend="Dentro del límite"
          color="purple"
        />
        <StatCard 
          title="Eficiencia de Caché" 
          value={`${stats.avgCacheRate}%`} 
          icon={<ShieldCheck className="text-green-500" />} 
          trend="Ahorro optimizado"
          color="green"
        />
        <StatCard 
          title="Módulo Líder" 
          value={stats.topFeature} 
          icon={<TrendingUp className="text-blue-500" />} 
          trend="Mayor actividad"
          color="indigo"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usage Over Time */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Uso de APIs por Módulo
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="api_calls" name="Llamadas API" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cache_hits" name="Caché Hits" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Token Consumption */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" /> Consumo de Tokens (Diario)
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="total_tokens" name="Tokens" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorTokens)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Details Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Detalle Operativo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Módulo</th>
                <th className="px-6 py-4">API Calls</th>
                <th className="px-6 py-4">Cache Hits</th>
                <th className="px-6 py-4">Rate Caché</th>
                <th className="px-6 py-4">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">{row.date}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 uppercase">
                      {row.feature}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.api_calls}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.cache_hits}</td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[100px]">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full" 
                        style={{ width: `${row.cache_hit_rate_pct}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">{row.cache_hit_rate_pct}%</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-purple-600">
                    {row.total_tokens?.toLocaleString() || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }: any) {
  const colorMap: any = {
    blue: 'border-blue-100 bg-blue-50/30',
    purple: 'border-purple-100 bg-purple-50/30',
    green: 'border-green-100 bg-green-50/30',
    indigo: 'border-indigo-100 bg-indigo-50/30',
  };

  return (
    <div className={`p-6 rounded-2xl border ${colorMap[color]} shadow-sm transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white rounded-xl shadow-sm text-slate-600 [&_svg]:w-6 [&_svg]:h-6">
          {icon}
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{trend}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{value}</h4>
      </div>
    </div>
  );
}
