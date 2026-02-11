'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  Filter,
  Search,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import axios from 'axios';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LabResult {
  id: string;
  title: string;
  description: string;
  result_type: string;
  status: 'pending' | 'approved' | 'rejected';
  is_critical: boolean;
  created_at: string;
  specialist_name: string;
  specialist_lab_name: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_id_number: string;
  attachments: any[];
  patient?: any;
  doctor?: any;
  consultation?: any;
}

export default function LabResultsPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<LabResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<LabResult[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    filterResults();
  }, [results, statusFilter, searchQuery]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('No autenticado');
        return;
      }

      const res = await axios.get('/api/medic/lab-results', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setResults(res.data.results || []);
    } catch (err: any) {
      console.error('Error fetching results:', err);
      if (err.response?.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else {
        toast.error('Error al cargar resultados');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterResults = () => {
    let filtered = results;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.patient_first_name?.toLowerCase().includes(query) ||
        r.patient_last_name?.toLowerCase().includes(query) ||
        r.patient_id_number?.includes(query) ||
        r.specialist_name.toLowerCase().includes(query)
      );
    }

    setFilteredResults(filtered);
  };

  const handleApprove = async (id: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('No autenticado');
        return;
      }

      await axios.patch(`/api/medic/lab-results/${id}/approve`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success('Resultado aprobado');
      fetchResults();
      setShowDetail(false);
    } catch (err: any) {
      console.error('Error approving:', err);
      if (err.response?.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else {
        toast.error('Error al aprobar resultado');
      }
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Razón del rechazo:');
    if (!reason) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('No autenticado');
        return;
      }

      await axios.patch(`/api/medic/lab-results/${id}/reject`, { reason }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success('Resultado rechazado');
      fetchResults();
      setShowDetail(false);
    } catch (err: any) {
      console.error('Error rejecting:', err);
      if (err.response?.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else {
        toast.error('Error al rechazar resultado');
      }
    }
  };

  const getStatusBadge = (status: string, isCritical: boolean) => {
    const badges = {
      pending: (
        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          Pendiente
        </span>
      ),
      approved: (
        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          Aprobado
        </span>
      ),
      rejected: (
        <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
          <XCircle className="w-3 h-3" />
          Rechazado
        </span>
      )
    };

    return (
      <div className="flex items-center gap-2">
        {badges[status as keyof typeof badges]}
        {isCritical && (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Crítico
          </span>
        )}
      </div>
    );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Resultados de Laboratorio
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Gestiona los resultados cargados por laboratorios externos
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por paciente, cédula, título..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="approved">Aprobados</option>
                <option value="rejected">Rechazados</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {results.filter(r => r.status === 'pending').length}
              </p>
              <p className="text-xs text-slate-600">Pendientes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {results.filter(r => r.status === 'approved').length}
              </p>
              <p className="text-xs text-slate-600">Aprobados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {results.filter(r => r.status === 'rejected').length}
              </p>
              <p className="text-xs text-slate-600">Rechazados</p>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {filteredResults.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No hay resultados
              </h3>
              <p className="text-slate-600">
                {searchQuery || statusFilter !== 'all'
                  ? 'No se encontraron resultados con los filtros aplicados'
                  : 'Aún no hay resultados cargados'}
              </p>
            </div>
          ) : (
            filteredResults.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Main Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                          {result.title}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {getResultTypeLabel(result.result_type)}
                        </p>
                      </div>
                      {getStatusBadge(result.status, result.is_critical)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">
                          {result.patient_first_name} {result.patient_last_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">
                          Cédula: {result.patient_id_number}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">
                          {result.specialist_lab_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">
                          {new Date(result.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>

                    {result.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2">
                    <Button
                      onClick={() => {
                        setSelectedResult(result);
                        setShowDetail(true);
                      }}
                      className="flex-1 lg:flex-none bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalle
                    </Button>

                    {result.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleApprove(result.id)}
                          className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          onClick={() => handleReject(result.id)}
                          className="flex-1 lg:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

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
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
              >
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      {selectedResult.title}
                    </h2>
                    {getStatusBadge(selectedResult.status, selectedResult.is_critical)}
                  </div>

                  {/* Patient Info */}
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <h3 className="font-semibold text-teal-900 mb-3">Información del Paciente</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600">Nombre:</p>
                        <p className="font-medium text-slate-900">
                          {selectedResult.patient_first_name} {selectedResult.patient_last_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Cédula:</p>
                        <p className="font-medium text-slate-900">{selectedResult.patient_id_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* Result Info */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Información del Resultado</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-slate-600">Tipo:</p>
                        <p className="text-slate-900">{getResultTypeLabel(selectedResult.result_type)}</p>
                      </div>
                      {selectedResult.description && (
                        <div>
                          <p className="text-slate-600">Descripción:</p>
                          <p className="text-slate-900">{selectedResult.description}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-600">Fecha de carga:</p>
                        <p className="text-slate-900">
                          {new Date(selectedResult.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Specialist Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-semibold text-blue-900 mb-3">Información del Especialista</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-blue-700">Nombre:</p>
                        <p className="font-medium text-blue-900">{selectedResult.specialist_name}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Laboratorio:</p>
                        <p className="font-medium text-blue-900">{selectedResult.specialist_lab_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedResult.attachments && selectedResult.attachments.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3">Archivos Adjuntos</h3>
                      <div className="space-y-2">
                        {selectedResult.attachments.map((file: any, index: number) => (
                          <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-slate-100 transition-colors"
                          >
                            <FileText className="w-5 h-5 text-slate-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{file.name}</p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Download className="w-5 h-5 text-teal-600" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <Button
                      onClick={() => setShowDetail(false)}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-xl"
                    >
                      Cerrar
                    </Button>
                    {selectedResult.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleApprove(selectedResult.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl"
                        >
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          onClick={() => handleReject(selectedResult.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl"
                        >
                          <XCircle className="w-5 h-5 mr-2" />
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
