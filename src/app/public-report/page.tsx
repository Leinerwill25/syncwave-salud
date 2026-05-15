import { Metadata } from 'next';
import crypto from 'crypto';
import PublicReportClient from './PublicReportClient';

export const metadata: Metadata = {
  title: 'Reporte Quincenal - ASHIRA',
  description: 'Reporte de rendimiento gerencial temporal',
};

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? '';

interface PageProps {
  searchParams: Promise<{
    clinicaId?: string;
    expiresAt?: string;
    sig?: string;
  }>;
}

export default async function PublicReportPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const { clinicaId, expiresAt, sig } = resolvedParams;
  
  if (!clinicaId || !expiresAt || !sig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center max-w-md">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Acceso Inválido</h1>
          <p className="text-slate-600">Faltan parámetros necesarios para acceder al reporte.</p>
        </div>
      </div>
    );
  }
  
  // 1. Verificar expiración
  const expiresTimestamp = parseInt(expiresAt, 10);
  if (Date.now() > expiresTimestamp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center max-w-md">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Enlace Expirado</h1>
          <p className="text-slate-600">Este enlace ha caducado por razones de seguridad (límite de 3 horas).</p>
        </div>
      </div>
    );
  }
  
  // 2. Verificar firma
  const secret = SUPABASE_SERVICE_ROLE_KEY;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${clinicaId}:${expiresAt}`)
    .digest('hex');
    
  if (sig !== expectedSig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center max-w-md">
          <h1 className="text-xl font-bold text-slate-900 mb-2">No Autorizado</h1>
          <p className="text-slate-600">La firma digital no es válida.</p>
        </div>
      </div>
    );
  }
  
  return <PublicReportClient clinicaId={clinicaId} expiresAt={expiresAt} sig={sig} />;
}
