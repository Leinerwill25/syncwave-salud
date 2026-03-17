import { redirect } from 'next/navigation';
import { getCurrentNurseProfileSSR } from '@/lib/auth/nurse-auth-server';
import { NurseAffiliatedDashboard } from '@/components/nurse/dashboard/NurseAffiliatedDashboard';
import { getDashboardSummaryServer, getDailyQueueServer } from '@/lib/supabase/nurse-server.service';

export default async function NurseDashboardPage() {
  const nurseSession = await getCurrentNurseProfileSSR();

  if (!nurseSession) {
    redirect('/login?redirect=/dashboard/nurse');
  }

  // Si es independiente, redirigir a su ruta específica
  if (nurseSession.nurseType === 'independent') {
    redirect('/dashboard/nurse/independent');
  }

  // Obtener datos iniciales en el servidor para carga instantánea
  const [initialSummary, initialQueue] = await Promise.all([
    getDashboardSummaryServer(),
    getDailyQueueServer()
  ]);

  // Para enfermeras afiliadas, mostrar el dashboard normal
  return <NurseAffiliatedDashboard initialSummary={initialSummary} initialQueue={initialQueue} />;
}
