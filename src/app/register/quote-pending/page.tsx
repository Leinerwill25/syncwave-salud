'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuotePendingPage() {
  const router = useRouter();
  const [details, setDetails] = useState<{ specialists: string; sedes: string } | null>(null);

  useEffect(() => {
    const specialists = localStorage.getItem('pendingQuote_specialistCount');
    const sedes = localStorage.getItem('pendingQuote_sedeCount');
    if (specialists && sedes) {
      setDetails({ specialists, sedes });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-indigo-600 to-teal-600 h-2 w-full" />
        
        <div className="p-8 sm:p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-800 mb-4">¡Solicitud Recibida!</h1>
          
          <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
            Hemos registrado tu solicitud para el Plan Institucional Personalizado. 
            Debido a la escala de tu organización (@{details?.specialists} especialistas y @{details?.sedes} sedes), 
            nuestro equipo comercial preparará una oferta a medida.
          </p>

          <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Próximos pasos</h2>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-600 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
                <p className="text-slate-700 text-sm">Un asesor senior analizará tus requerimientos de infraestructura.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-600 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
                <p className="text-slate-700 text-sm">Recibirás un correo electrónico y una llamada en las próximas 24 horas hábiles.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-600 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
                <p className="text-slate-700 text-sm">Activaremos tu entorno institucional una vez aprobada la cotización.</p>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/"
              className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition"
            >
              Volver al Inicio
            </Link>
            <a 
              href="https://wa.me/584124885623" 
              target="_blank"
              className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
            >
              Hablar con Soporte
            </a>
          </div>
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            ID de Solicitud de Organización: <span className="font-mono text-slate-700">{localStorage.getItem('pendingQuote_organizationId')?.slice(0, 8) || '---------'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
