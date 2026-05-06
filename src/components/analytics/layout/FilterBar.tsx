'use client';

import React from 'react';
import { Calendar, Filter, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  onFilterChange: (filters: any) => void;
  organizations?: any[];
  showRegionFilter?: boolean;
  showSpecialtyFilter?: boolean;
  className?: string;
}

export function FilterBar({ 
  onFilterChange, 
  organizations = [],
  showRegionFilter = true, 
  showSpecialtyFilter = true,
  className
}: FilterBarProps) {
  const [timeRange, setTimeRange] = React.useState('6m');
  const [region, setRegion] = React.useState('all');
  const [specialty, setSpecialty] = React.useState('all');
  const [organizationId, setOrganizationId] = React.useState('all');

  const handleApplyFilters = () => {
    const now = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case '1m':
        start.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        start.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        start.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    onFilterChange({
      timeRange: { start, end: now },
      region: region === 'all' ? undefined : region,
      specialty: specialty === 'all' ? undefined : specialty,
      organizationId: organizationId === 'all' ? undefined : organizationId
    });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Time Range Select */}
      <div className="relative">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="appearance-none pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer hover:border-slate-300"
        >
          <option value="1m">1 Mes</option>
          <option value="3m">3 Meses</option>
          <option value="6m">6 Meses</option>
          <option value="1y">1 Año</option>
        </select>
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
      </div>

      {showRegionFilter && (
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer hover:border-slate-300"
        >
          <option value="all">Todas las regiones</option>
          <option value="caracas">Caracas</option>
          <option value="maracaibo">Maracaibo</option>
          <option value="valencia">Valencia</option>
        </select>
      )}

      {showSpecialtyFilter && (
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer hover:border-slate-300"
        >
          <option value="all">Todas las especialidades</option>
          <option value="medicina_general">Medicina General</option>
          <option value="cardiologia">Cardiología</option>
          <option value="pediatria">Pediatría</option>
          <option value="ginecologia">Ginecología</option>
          <option value="traumatologia">Traumatología</option>
        </select>
      )}

      <select
        value={organizationId}
        onChange={(e) => setOrganizationId(e.target.value)}
        className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer hover:border-slate-300 max-w-[200px]"
      >
        <option value="all">Todas las organizaciones</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>

      <button
        onClick={handleApplyFilters}
        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100 flex items-center gap-1.5 active:scale-95"
      >
        <Filter className="w-3.5 h-3.5" />
        Filtrar
      </button>
    </div>
  );
}

