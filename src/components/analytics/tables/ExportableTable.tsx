'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { DataTable } from './DataTable';
import { exportToCSV, exportToExcel, exportToJSON } from '@/lib/analytics/utils/export';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface ExportableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  filename?: string;
  emptyMessage?: string;
}

export function ExportableTable<T extends Record<string, any>>({ 
  data, 
  columns, 
  title,
  filename = 'datos',
  emptyMessage 
}: ExportableTableProps<T>) {
  const handleExport = (format: 'csv' | 'excel' | 'json') => {
    if (format === 'csv') {
      exportToCSV(data, filename);
    } else if (format === 'excel') {
      exportToExcel(data, filename);
    } else {
      exportToJSON(data, filename);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>
      <DataTable data={data} columns={columns} emptyMessage={emptyMessage} />
    </div>
  );
}

