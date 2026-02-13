'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileType, CheckCircle2, AlertCircle, Loader2, Download, Trash2, Plus, Search, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Template = {
    id: string;
    name: string;
    description: string | null;
    file_path: string;
    file_url?: string;
    created_at: string;
};

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    // Upload Form State
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const res = await fetch('/api/medic/prescription-templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data.templates || []);
            }
        } catch (err) {
            console.error('Error loading templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const validExtensions = ['.docx', '.doc'];
        const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

        if (!validExtensions.includes(fileExtension)) {
            setError('Por favor, selecciona un archivo Word (.docx o .doc)');
            setFile(null);
            return;
        }

        if (selectedFile.size > 50 * 1024 * 1024) {
            setError('El archivo es demasiado grande (máximo 50MB)');
            setFile(null);
            return;
        }

        setFile(selectedFile);
        setError(null);
        // Auto-fill name if empty
        if (!name) {
            setName(selectedFile.name.replace(fileExtension, ''));
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !name) {
            setError('Por favor, completa los campos requeridos');
            return;
        }

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', name);
            formData.append('description', description);

            const res = await fetch('/api/medic/prescription-templates', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al subir la plantilla');

            setSuccess('Plantilla guardada exitosamente');
            setFile(null);
            setName('');
            setDescription('');
            setIsUploadModalOpen(false);
            loadTemplates(); // Reload list
        } catch (err: any) {
            setError(err.message || 'Error al subir la plantilla');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) return;

        try {
            const res = await fetch(`/api/medic/prescription-templates?id=${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Error al eliminar');
            setTemplates(templates.filter(t => t.id !== id));
        } catch (err) {
            console.error(err);
            alert('No se pudo eliminar la plantilla');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mis Plantillas de Recetas</h1>
                        <p className="text-slate-600 mt-2">Gestiona tus modelos de recetas para diferentes diagnósticos o tratamientos.</p>
                    </div>
                    <button 
                        onClick={() => setIsUploadModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition transform"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Plantilla
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                     <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-20 bg-white/60 rounded-3xl border border-dashed border-slate-300">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800">No tienes plantillas guardadas</h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">Sube tu primera plantilla Word (.docx) para agilizar la creación de recetas.</p>
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="mt-6 text-teal-600 font-medium hover:underline"
                        >
                            Subir plantilla ahora
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template) => (
                            <motion.div 
                                key={template.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition p-5 flex flex-col"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <FileType className="w-6 h-6" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {template.file_url && (
                                            <a 
                                                href={template.file_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                                title="Descargar"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                        )}
                                        <button 
                                            onClick={() => handleDelete(template.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                <h3 className="text-lg font-bold text-slate-900 mb-1 truncate" title={template.name}>{template.name}</h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{template.description || 'Sin descripción'}</p>
                                
                                <div className="mt-auto pt-4 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
                                    <span>{new Date(template.created_at).toLocaleDateString()}</span>
                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-500">.docx</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {isUploadModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-900">Nueva Plantilla</h2>
                                <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            
                            <form onSubmit={handleUpload} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ej: Gripe Común, Pediatría General..."
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                    <textarea 
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Breve descripción de cuándo usar esta plantilla..."
                                        rows={3}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Archivo (.docx)</label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative">
                                        <input 
                                            type="file" 
                                            accept=".docx,.doc" 
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="flex flex-col items-center gap-2 pointer-events-none">
                                            <Upload className="w-8 h-8 text-slate-400" />
                                            {file ? (
                                                <span className="text-teal-600 font-medium">{file.name}</span>
                                            ) : (
                                                <span className="text-slate-500 text-sm">Arrastra o selecciona un archivo Word</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> {error}
                                    </div>
                                )}
                                
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsUploadModalOpen(false)}
                                        className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={uploading || !file || !name}
                                        className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                    >
                                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Plantilla'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
