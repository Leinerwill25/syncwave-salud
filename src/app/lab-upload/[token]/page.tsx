'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
  AlertCircle
} from 'lucide-react';
import PatientSearch from './components/PatientSearch';
import UploadForm from './components/UploadForm';
import SuccessMessage from './components/SuccessMessage';

export default function LabUploadPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');

  const [step, setStep] = useState<'search' | 'form' | 'success'>('search');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [submittedResult, setSubmittedResult] = useState<any>(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setValidating(true);
      const res = await fetch(`/api/public/lab-upload/${token}/validate`);
      const data = await res.json();

      if (data.valid) {
        setIsValid(true);
        setOrganizationName(data.organizationName);
      } else {
        setIsValid(false);
        setError(data.error || 'Token inválido');
      }
    } catch (err) {
      console.error('Error validating token:', err);
      setIsValid(false);
      setError('Error al validar el link');
    } finally {
      setValidating(false);
    }
  };

  const handlePatientSelected = (patient: any, consultation: any) => {
    setSelectedPatient(patient);
    setSelectedConsultation(consultation);
    setStep('form');
  };

  const handleFormSubmitted = (result: any) => {
    setSubmittedResult(result);
    setStep('success');
  };

  const handleUploadAnother = () => {
    setSelectedPatient(null);
    setSelectedConsultation(null);
    setSubmittedResult(null);
    setStep('search');
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Validando acceso...</p>
        </motion.div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Link Inválido
          </h1>
          <p className="text-slate-600 mb-6">
            {error || 'Este link no es válido o ha expirado.'}
          </p>
          <p className="text-sm text-slate-500">
            Por favor, contacta al consultorio para obtener un nuevo link.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-teal-500 to-cyan-500 p-3 rounded-xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Carga de Resultados de Laboratorio
              </h1>
              <p className="text-slate-600">
                {organizationName}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Instrucciones:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Busca al paciente por número de cédula</li>
                <li>Completa el formulario con la información del resultado</li>
                <li>Sube los archivos correspondientes (imágenes, informes, etc.)</li>
                <li>Envía el resultado para que sea revisado por el médico</li>
              </ol>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {step === 'search' && (
            <PatientSearch
              token={token}
              onPatientSelected={handlePatientSelected}
            />
          )}

          {step === 'form' && (
            <UploadForm
              token={token}
              patient={selectedPatient}
              consultation={selectedConsultation}
              onSubmitted={handleFormSubmitted}
              onBack={() => setStep('search')}
            />
          )}

          {step === 'success' && (
            <SuccessMessage
              result={submittedResult}
              onUploadAnother={handleUploadAnother}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
