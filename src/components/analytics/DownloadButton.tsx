'use client';

import React from 'react';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DownloadButtonProps {
  data: any[];
  fileName?: string;
  label?: string;
}

export function DownloadButton({ data, fileName = 'reporte', label = 'Descargar Reporte' }: DownloadButtonProps) {
  const handleDownload = () => {
    if (!data || data.length === 0) {
      alert('No hay datos para descargar.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
}
