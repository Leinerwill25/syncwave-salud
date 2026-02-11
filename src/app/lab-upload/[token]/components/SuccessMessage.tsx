'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  FileText,
  Calendar,
  User,
  Building2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessMessageProps {
  result: any;
  onUploadAnother: () => void;
}

export default function SuccessMessage({ result, onUploadAnother }: SuccessMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl shadow-lg p-8"
    >
      {/* Success Icon */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4"
        >
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-slate-900 mb-2"
        >
          ¡Resultado Enviado Exitosamente!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-slate-600"
        >
          El resultado ha sido cargado y está pendiente de revisión por el médico.
        </motion.p>
      </div>

      {/* Result Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-6 mb-6"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700">Título</p>
              <p className="text-slate-900 font-semibold">{result?.title}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700">Fecha de carga</p>
              <p className="text-slate-900">
                {new Date().toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700">Estado</p>
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full mt-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Pendiente de Revisión
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Next Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">Próximos Pasos:</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>El médico revisará el resultado cargado</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Una vez aprobado, el paciente recibirá una notificación</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>El resultado estará disponible en el historial médico del paciente</span>
          </li>
        </ul>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button
          onClick={onUploadAnother}
          className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-3 rounded-xl font-medium"
        >
          Cargar Otro Resultado
        </Button>
      </motion.div>

      {/* Footer Note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center text-sm text-slate-500 mt-6"
      >
        Gracias por utilizar nuestro sistema de carga de resultados
      </motion.p>
    </motion.div>
  );
}
