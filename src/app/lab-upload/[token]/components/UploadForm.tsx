'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  AlertCircle,
  ArrowLeft,
  User,
  Building2,
  Phone,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { compressImages } from '@/lib/image-compression';

interface UploadFormProps {
  token: string;
  patient: any;
  consultation: any;
  onSubmitted: (result: any) => void;
  onBack: () => void;
}

export default function UploadForm({
  token,
  patient,
  consultation,
  onSubmitted,
  onBack
}: UploadFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resultType, setResultType] = useState('lab_test');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  // Specialist info
  const [specialistName, setSpecialistName] = useState('');
  const [specialistIdNumber, setSpecialistIdNumber] = useState('');
  const [specialistLabName, setSpecialistLabName] = useState('');
  const [specialistEmail, setSpecialistEmail] = useState('');
  const [specialistPhone, setSpecialistPhone] = useState('');

  // Patient info (for non-registered)
  const [patientFirstName, setPatientFirstName] = useState(patient?.firstName || '');
  const [patientLastName, setPatientLastName] = useState(patient?.lastName || '');
  const [patientEmail, setPatientEmail] = useState(patient?.email || '');
  const [patientPhone, setPatientPhone] = useState(patient?.phone || '');
  const [compressing, setCompressing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Comprimir imágenes
      setCompressing(true);
      try {
        const compressedFiles = await compressImages(newFiles, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8
        });
        
        setFiles(prev => [...prev, ...compressedFiles]);
        
        // Mostrar mensaje si hubo compresión significativa
        const totalOriginal = newFiles.reduce((sum, f) => sum + f.size, 0);
        const totalCompressed = compressedFiles.reduce((sum, f) => sum + f.size, 0);
        const reduction = ((totalOriginal - totalCompressed) / totalOriginal) * 100;
        
        if (reduction > 10) {
          toast.success(`Imágenes optimizadas (${reduction.toFixed(0)}% más ligeras)`);
        }
      } catch (err) {
        console.error('Error compressing images:', err);
        // Si falla la compresión, usar archivos originales
        setFiles(prev => [...prev, ...newFiles]);
        toast.warning('No se pudieron comprimir las imágenes, usando originales');
      } finally {
        setCompressing(false);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    if (!specialistName.trim() || !specialistIdNumber.trim() || !specialistLabName.trim()) {
      toast.error('La información del especialista es requerida');
      return;
    }

    if (!patientFirstName.trim() || !patientLastName.trim()) {
      toast.error('El nombre del paciente es requerido');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      
      // Patient info
      if (consultation) {
        formData.append('consultationId', consultation.id);
      }
      if (patient?.id) {
        formData.append('patientId', patient.id);
        formData.append('isRegistered', 'true');
      } else {
        formData.append('isRegistered', 'false');
      }
      formData.append('patientIdNumber', patient?.identifier || '');
      formData.append('patientFirstName', patientFirstName);
      formData.append('patientLastName', patientLastName);
      if (patientEmail) formData.append('patientEmail', patientEmail);
      if (patientPhone) formData.append('patientPhone', patientPhone);

      // Result info
      formData.append('title', title);
      formData.append('description', description);
      formData.append('resultType', resultType);
      if (additionalDetails) formData.append('additionalDetails', additionalDetails);
      formData.append('isCritical', isCritical.toString());

      // Specialist info
      formData.append('specialistName', specialistName);
      formData.append('specialistIdNumber', specialistIdNumber);
      formData.append('specialistLabName', specialistLabName);
      if (specialistEmail) formData.append('specialistEmail', specialistEmail);
      if (specialistPhone) formData.append('specialistPhone', specialistPhone);

      // Files
      files.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch(`/api/public/lab-upload/${token}/submit`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Resultado enviado exitosamente');
        onSubmitted(data.result);
      } else {
        toast.error(data.error || 'Error al enviar resultado');
      }
    } catch (err) {
      console.error('Error submitting:', err);
      toast.error('Error al enviar resultado');
    } finally {
      setSubmitting(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-lg p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={onBack}
          variant="ghost"
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold text-slate-900">
          Cargar Resultado de Laboratorio
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Info Display */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-teal-900 mb-2">Paciente:</p>
          <p className="text-slate-900 font-medium">
            {patientFirstName} {patientLastName}
          </p>
          <p className="text-sm text-slate-600">
            Cédula: {patient?.identifier}
          </p>
          {consultation && (
            <p className="text-sm text-slate-600 mt-1">
              Consulta: {new Date(consultation.date).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>

        {/* Result Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Información del Resultado</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Título del Resultado <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Hemograma Completo"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Resultado
            </label>
            <select
              value={resultType}
              onChange={(e) => setResultType(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="lab_test">Análisis de Laboratorio</option>
              <option value="blood_work">Hematología</option>
              <option value="urine_test">Urianálisis</option>
              <option value="imaging">Imágenes Médicas</option>
              <option value="pathology">Patología</option>
              <option value="microbiology">Microbiología</option>
              <option value="biochemistry">Bioquímica</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el resultado..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Detalles Adicionales
            </label>
            <textarea
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="Información adicional relevante..."
              rows={2}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isCritical"
              checked={isCritical}
              onChange={(e) => setIsCritical(e.target.checked)}
              className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="isCritical" className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Resultado Crítico (requiere atención inmediata)
            </label>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Archivos Adjuntos</h3>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-teal-400 transition-colors">
            <input
              type="file"
              id="fileInput"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={compressing}
            />
            <label htmlFor="fileInput" className={`cursor-pointer ${compressing ? 'opacity-50' : ''}`}>
              {compressing ? (
                <>
                  <Loader2 className="w-12 h-12 text-teal-600 mx-auto mb-3 animate-spin" />
                  <p className="text-slate-600 font-medium mb-1">
                    Optimizando imágenes...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium mb-1">
                    Click para seleccionar archivos
                  </p>
                  <p className="text-sm text-slate-500">
                    Imágenes y PDFs (se optimizarán automáticamente)
                  </p>
                </>
              )}
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3"
                >
                  <div className="text-slate-600">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Specialist Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Información del Especialista</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={specialistName}
                  onChange={(e) => setSpecialistName(e.target.value)}
                  placeholder="Nombre del especialista"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cédula <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={specialistIdNumber}
                onChange={(e) => setSpecialistIdNumber(e.target.value)}
                placeholder="Número de cédula"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Laboratorio/Centro Clínico <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={specialistLabName}
                  onChange={(e) => setSpecialistLabName(e.target.value)}
                  placeholder="Nombre del laboratorio"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={specialistEmail}
                  onChange={(e) => setSpecialistEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={specialistPhone}
                  onChange={(e) => setSpecialistPhone(e.target.value)}
                  placeholder="0412-1234567"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Patient Contact Info (for non-registered) */}
        {!patient?.id && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Información de Contacto del Paciente</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={patientFirstName}
                  onChange={(e) => setPatientFirstName(e.target.value)}
                  placeholder="Nombre"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={patientLastName}
                  onChange={(e) => setPatientLastName(e.target.value)}
                  placeholder="Apellido"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="0412-1234567"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="flex-1 py-3 rounded-xl"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              'Enviar Resultado'
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
