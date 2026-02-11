'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  ChevronRight,
  Stethoscope,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Consultation {
  id: string;
  started_at: string;
  status: string;
  chief_complaint: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  appointment: {
    id: string;
    reason: string | null;
    scheduled_at: string;
  } | null;
}

export default function TodayConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTodayConsultations();
  }, []);

  const fetchTodayConsultations = async () => {
    try {
      setLoading(true);
      
      // Obtener el inicio y fin del día actual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: { session } } = await supabase.auth.getSession();
      const authId = session?.user?.id;

      if (!authId) {
        console.error('No user session found');
        setConsultations([]);
        return;
      }

      // Obtener el ID del usuario de la tabla user
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('id')
        .eq('authId', authId)
        .single();

      console.log('User lookup result:', { userData, userError });

      if (userError || !userData) {
        console.error('User not found in database:', userError);
        setConsultations([]);
        return;
      }

      console.log('Fetching consultations for doctor ID:', userData.id);
      console.log('Date range:', {
        start: today.toISOString(),
        end: tomorrow.toISOString()
      });

      // Consultar las consultas programadas para hoy (usando started_at)
      const { data, error } = await supabase
        .from('consultation')
        .select('*')
        .eq('doctor_id', userData.id)
        .gte('started_at', today.toISOString())
        .lt('started_at', tomorrow.toISOString())
        .order('started_at', { ascending: true });

      console.log('Query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Error fetching consultations:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setConsultations([]);
        return;
      }

      // Transform data to match interface
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        started_at: item.started_at,
        status: item.status,
        chief_complaint: item.chief_complaint,
        patient: null, // Will be populated when we add relations back
        appointment: null
      }));

      console.log('Transformed consultations:', transformedData.length);
      setConsultations(transformedData);
    } catch (err) {
      console.error('Error:', err);
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConsultationClick = (consultationId: string) => {
    router.push(`/dashboard/medic/consultas/${consultationId}/edit`);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
      case 'programada':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in_progress':
      case 'en_progreso':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed':
      case 'completada':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled':
      case 'cancelada':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return 'Programada';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status || 'Sin estado';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPatientName = (consultation: Consultation) => {
    if (consultation.patient) {
      return `${consultation.patient.firstName} ${consultation.patient.lastName}`;
    }
    return 'Paciente sin nombre';
  };

  const getReason = (consultation: Consultation) => {
    return consultation.chief_complaint || 
           consultation.appointment?.reason || 
           'Sin motivo especificado';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Consultas Programadas Hoy
            </h2>
            <p className="text-xs text-teal-50">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {consultations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-slate-100 rounded-full p-4 mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">
              No hay consultas programadas para hoy
            </p>
            <p className="text-sm text-slate-500">
              Las consultas del día aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {consultations.map((consultation, index) => (
              <motion.div
                key={consultation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleConsultationClick(consultation.id)}
                className="group relative bg-gradient-to-r from-slate-50 to-white hover:from-teal-50 hover:to-cyan-50 border-2 border-slate-200 hover:border-teal-300 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-md"
              >
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(consultation.status)}`}>
                    {getStatusText(consultation.status)}
                  </span>
                </div>

                {/* Main Content */}
                <div className="pr-24">
                  {/* Patient Name */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-gradient-to-br from-teal-500 to-cyan-500 p-1.5 rounded-full">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {getPatientName(consultation)}
                    </h3>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2 mb-2 ml-7">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-sm text-slate-600 font-medium">
                      {formatTime(consultation.started_at || consultation.appointment?.scheduled_at || '')}
                    </span>
                  </div>

                  {/* Reason */}
                  <div className="flex items-start gap-2 ml-7">
                    <FileText className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {getReason(consultation)}
                    </p>
                  </div>
                </div>

                {/* Action Arrow */}
                <div className="absolute right-4 bottom-4">
                  <div className="bg-gradient-to-r from-teal-500 to-cyan-500 group-hover:from-teal-600 group-hover:to-cyan-600 p-2 rounded-full transition-all duration-300 group-hover:scale-110">
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Hover Effect Line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-xl" />
              </motion.div>
            ))}
          </div>
        )}

        {/* Info Footer */}
        {consultations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <AlertCircle className="w-4 h-4" />
              <span>
                Haz clic en una consulta para generar el informe con audio
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
