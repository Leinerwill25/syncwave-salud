'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface FilterBarProps {
  onFilterChange: (filters: any) => void;
  showRegionFilter?: boolean;
  showSpecialtyFilter?: boolean;
}

export function FilterBar({ 
  onFilterChange, 
  showRegionFilter = true, 
  showSpecialtyFilter = true 
}: FilterBarProps) {
  const [timeRange, setTimeRange] = React.useState('6m');
  const [region, setRegion] = React.useState('all');
  const [specialty, setSpecialty] = React.useState('all');

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
      specialty: specialty === 'all' ? undefined : specialty
    });
  };

  React.useEffect(() => {
    handleApplyFilters();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Período
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1m">Último mes</option>
            <option value="3m">Últimos 3 meses</option>
            <option value="6m">Últimos 6 meses</option>
            <option value="1y">Último año</option>
          </select>
        </div>

        {showRegionFilter && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Región
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las regiones</option>
              <option value="caracas">Caracas</option>
              <option value="maracaibo">Maracaibo</option>
              <option value="valencia">Valencia</option>
            </select>
          </div>
        )}

        {showSpecialtyFilter && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Especialidad
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las especialidades</option>
              <option value="medicina_general">Medicina General</option>
              <option value="cardiologia">Cardiología</option>
              <option value="pediatria">Pediatría</option>
            </select>
          </div>
        )}

        <div className="flex items-end">
          <button
            onClick={handleApplyFilters}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
}

