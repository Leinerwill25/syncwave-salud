'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Trash2, 
  File, 
  FileImage, 
  FileCheck, 
  Clock,
  User as UserIcon
} from 'lucide-react';
import Link from 'next/link';

interface ClinicalDocument {
  id: string;
  file_name: string;
  document_type: string;
  file_path: string;
  file_size_bytes?: number;
  mime_type?: string;
  description?: string;
  uploaded_at: string;
  patient?: {
    firstName: string;
    lastName: string;
  };
}

const DOCUMENT_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'HISTORIA_CLINICA', label: 'Historia Clínica' },
  { value: 'IMAGEN', label: 'Imagen diagnóstica' },
  { value: 'REPORTE', label: 'Reporte médico' },
  { value: 'EXAMEN', label: 'Examen de laboratorio' },
  { value: 'CERTIFICADO', label: 'Certificado médico' },
  { value: 'OTRO', label: 'Otro' },
];

export default function AdministrationDocumentsPage() {
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [selectedType]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/administration/documents?document_type=${selectedType}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDocuments(data.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => 
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.patient && `${doc.patient.firstName} ${doc.patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.includes('image')) return <FileImage className="w-8 h-8 text-emerald-500" />;
    if (mimeType?.includes('pdf')) return <FileText className="w-8 h-8 text-rose-500" />;
    return <File className="w-8 h-8 text-blue-500" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
        <div className="pl-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FileCheck className="w-7 h-7 text-emerald-600" />
            Documentos Clínicos
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl">
            Gestiona reportes, imágenes y certificados de todos los pacientes de la clínica.
          </p>
        </div>
        <Link
          href="/dashboard/administration/documents/new"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-1"
        >
          <Plus className="w-5 h-5" />
          Subir Documento
        </Link>
      </div>

      {/* Utilities / Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nombre, paciente o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-5 h-5 text-slate-400 ml-2 md:block hidden" />
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full md:w-48 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
          >
            {DOCUMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List / Projects Grid Style */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {[...Array(8)].map((_, i) => (
             <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-40" />
           ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No se encontraron documentos</h3>
          <p className="text-slate-500 max-w-md mt-2">
            No hay archivos que coincidan con tus filtros o aún no se han subido documentos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 transition-colors">
                  {getFileIcon(doc.mime_type)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="flex-1 min-w-0 mb-4">
                <h3 className="font-bold text-slate-900 text-sm leading-tight truncate mb-1" title={doc.file_name}>
                  {doc.file_name}
                </h3>
                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium mb-3">
                   <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {doc.document_type.replace('_', ' ')}
                   </span>
                   <span>•</span>
                   <span>{formatFileSize(doc.file_size_bytes)}</span>
                </div>
              </div>

              <div className="mt-auto space-y-3 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                   <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                   <span className="truncate">
                      {doc.patient ? `${doc.patient.firstName} ${doc.patient.lastName}` : 'Paciente desconocido'}
                   </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                   <Clock className="w-3.5 h-3.5" />
                   {new Date(doc.uploaded_at).toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                   })}
                </div>
              </div>

              <button 
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors font-bold text-xs"
                onClick={() => window.open(doc.file_path, '_blank')}
              >
                <Download className="w-3.5 h-3.5" /> Descargar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
