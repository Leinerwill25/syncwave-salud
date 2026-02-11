'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  User,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PatientSearchProps {
  token: string;
  onPatientSelected: (patient: any, consultation: any) => void;
}

export default function PatientSearch({ token, onPatientSelected }: PatientSearchProps) {
  const [idNumber, setIdNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!idNumber.trim()) {
      setError('Por favor ingresa un número de cédula');
      return;
    }

    try {
      setSearching(true);
      setError('');
      setSearchResult(null);

      const res = await fetch(
        `/api/public/lab-upload/${token}/search-patient?idNumber=${encodeURIComponent(idNumber)}`
      );
      const data = await res.json();

      if (res.ok) {
        setSearchResult(data);
      } else {
        setError(data.error || 'Error al buscar paciente');
      }
    } catch (err) {
      console.error('Error searching patient:', err);
      setError('Error al buscar paciente');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectConsultation = (consultation: any) => {
    onPatientSelected(searchResult.patient, consultation);
  };

  const handleContinueWithoutConsultation = () => {
    onPatientSelected(searchResult.patient, null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-lg p-6"
    >
      <h2 className="text-xl font-bold text-slate-900 mb-4">
        Buscar Paciente
      </h2>

      {/* Search Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Número de Cédula
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ej: 12345678"
            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            disabled={searching}
          />
          <Button
            onClick={handleSearch}
            disabled={searching}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
          >
            {searching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Buscar
              </>
            )}
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}
      </div>

      {/* Search Results */}
      {searchResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Patient Info */}
          {searchResult.found && searchResult.patient && (
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-teal-600 p-2 rounded-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {searchResult.patient.firstName} {searchResult.patient.lastName}
                  </p>
                  <p className="text-sm text-slate-600">
                    Cédula: {searchResult.patient.identifier}
                  </p>
                </div>
                {searchResult.isRegistered && (
                  <div className="ml-auto">
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                      Registrado
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Consultations */}
          {searchResult.found && searchResult.consultations && searchResult.consultations.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Selecciona una consulta (opcional):
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResult.consultations.map((consultation: any) => (
                  <motion.div
                    key={consultation.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handleSelectConsultation(consultation)}
                    className="bg-white border-2 border-slate-200 hover:border-teal-400 rounded-xl p-4 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-900">
                            {new Date(consultation.date).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        {consultation.reason && (
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-slate-500 mt-0.5" />
                            <p className="text-sm text-slate-600">
                              {consultation.reason}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          Dr. {consultation.doctorName}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : searchResult.found ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                No se encontraron consultas previas para este paciente.
              </p>
            </div>
          ) : null}

          {/* Continue Without Consultation */}
          {searchResult.found && (
            <Button
              onClick={handleContinueWithoutConsultation}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-all"
            >
              Continuar sin vincular a consulta
            </Button>
          )}
        </motion.div>
      )}

      {searchResult && !searchResult.found && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center"
        >
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-2">
            Paciente no encontrado
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            No se encontró un paciente con esta cédula en el sistema.
          </p>
          <Button
            onClick={() => onPatientSelected({ identifier: idNumber }, null)}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-medium"
          >
            Continuar de todas formas
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
