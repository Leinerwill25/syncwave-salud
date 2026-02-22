'use client';
// src/app/nurse/reports/new/page.tsx
import { ShiftReportForm } from '@/components/nurse/reports/ShiftReportForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewReportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto mb-8">
        <Link 
          href="/nurse/reports"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-teal-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a Reportes
        </Link>
      </div>
      
      <ShiftReportForm />
    </div>
  );
}
