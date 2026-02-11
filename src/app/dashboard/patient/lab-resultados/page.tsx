'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Calendar,
  Building2,
  User,
  Download,
  Eye,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  AlertTriangle,
  Image as ImageIcon,
  File
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LabResult {
  id: string;
  title: string;
  description: string;
  result_type: string;
  is_critical: boolean;
  created_at: string;
  specialist_name: string;
  specialist_lab_name: string;
  attachments: any[];
  additional_details: string;
  consultation?: any;
  doctor?: any;
}

export default function PatientLabResultsPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<LabResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<LabResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    filterResults();
  }, [results, searchQuery]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('No autenticado');
        return;
      }

      // Obtener resultados aprobados del paciente
      const { data, error } = await supabase
        .from('lab_result_upload')
        .select(`
          *,
          consultation:consultation_id (
            id,
            started_at,
            chief_complaint
          ),
          doctor:doctor_id (
            id,
            name
          )
        `)
        .eq('patient_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching results:', error);
        toast.error('Error al cargar resultados');
        return;
      }

      setResults(data || []);

      // Marcar como visto
      if (data && data.length > 0) {
        const unseenIds = data.filter(r => !r.viewed_by_patient).map(r => r.id);
        if (unseenIds.length > 0) {
          await supabase
            .from('lab_result_upload')
            .update({ viewed_by_patient: true })
            .in('id', unseenIds);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al cargar resultados');
    } finally {
      setLoading(false);
    }
  };

  const filterResults = () => {
    if (!searchQuery.trim()) {
      setFilteredResults(results);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = results.filter(r =>
      r.title.toLowerCase().includes(query) ||
      r.specialist_lab_name.toLowerCase().includes(query) ||
      r.result_type.toLowerCase().includes(query)
    );

    setFilteredResults(filtered);
  };

  const getResultTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lab_test: 'Análisis de Laboratorio',
      blood_work: 'Hematología',
      urine_test: 'Urianálisis',
      imaging: 'Imágenes Médicas',
      pathology: 'Patología',
      microbiology: 'Microbiología',
      biochemistry: 'Bioquímica',
      other: 'Otro'
    };
    return labels[type] || type;
  };

  const getFileIcon = (file: any) => {
    if (file.type?.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Resultados de Laboratorio
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Tus resultados médicos siempre disponibles
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, laboratorio, tipo..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Results Grid */}
        {filteredResults.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchQuery ? 'No se encontraron resultados' : 'No tienes resultados aún'}
            </h3>
            <p className="text-slate-600">
              {searchQuery
                ? 'Intenta con otros términos de búsqueda'
                : 'Cuando tu médico apruebe resultados de laboratorio, aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredResults.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer"
                onClick={() => {
                  setSelectedResult(result);
                  setShowDetail(true);
                }}
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {result.title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {getResultTypeLabel(result.result_type)}
                      </p>
                    </div>
                    {result.is_critical && (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Crítico
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>{result.specialist_lab_name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        {new Date(result.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {result.doctor && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Dr. {result.doctor.name}</span>
                      </div>
                    )}

                    {result.attachments && result.attachments.length > 0 && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>{result.attachments.length} archivo(s) adjunto(s)</span>
                      </div>
                    )}
                  </div>

                  {/* Description Preview */}
                  {result.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {result.description}
                    </p>
                  )}

                  {/* CTA */}
                  <Button className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-2 rounded-xl font-medium">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalle
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetail && selectedResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowDetail(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 p-6 flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {selectedResult.title}
                    </h2>
                    <p className="text-teal-100">
                      {getResultTypeLabel(selectedResult.result_type)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetail(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Critical Alert */}
                  {selectedResult.is_critical && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-red-900">Resultado Crítico</p>
                          <p className="text-sm text-red-700">
                            Este resultado requiere atención médica. Consulta con tu doctor.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-sm text-slate-600 mb-1">Laboratorio</p>
                      <p className="font-semibold text-slate-900">
                        {selectedResult.specialist_lab_name}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-sm text-slate-600 mb-1">Especialista</p>
                      <p className="font-semibold text-slate-900">
                        {selectedResult.specialist_name}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-sm text-slate-600 mb-1">Fecha</p>
                      <p className="font-semibold text-slate-900">
                        {new Date(selectedResult.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>

                    {selectedResult.doctor && (
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-sm text-slate-600 mb-1">Médico Tratante</p>
                        <p className="font-semibold text-slate-900">
                          Dr. {selectedResult.doctor.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedResult.description && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">Descripción</h3>
                      <p className="text-slate-700 bg-slate-50 rounded-xl p-4">
                        {selectedResult.description}
                      </p>
                    </div>
                  )}

                  {/* Additional Details */}
                  {selectedResult.additional_details && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">Detalles Adicionales</h3>
                      <p className="text-slate-700 bg-slate-50 rounded-xl p-4">
                        {selectedResult.additional_details}
                      </p>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedResult.attachments && selectedResult.attachments.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3">
                        Archivos Adjuntos ({selectedResult.attachments.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedResult.attachments.map((file: any, index: number) => (
                          <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4 hover:from-teal-100 hover:to-cyan-100 transition-all group"
                          >
                            <div className="text-teal-600">
                              {getFileIcon(file)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-600">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Download className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Consultation Link */}
                  {selectedResult.consultation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-900 mb-1">
                        <strong>Vinculado a consulta:</strong>
                      </p>
                      <p className="text-sm text-blue-800">
                        {new Date(selectedResult.consultation.started_at).toLocaleDateString('es-ES')}
                        {selectedResult.consultation.chief_complaint && 
                          ` - ${selectedResult.consultation.chief_complaint}`
                        }
                      </p>
                    </div>
                  )}

                  {/* Close Button */}
                  <Button
                    onClick={() => setShowDetail(false)}
                    className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-xl font-medium"
                  >
                    Cerrar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
