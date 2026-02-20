'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Upload, FileText, Download, RefreshCw, Type, Palette, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, AlignmentType, WidthType, Table, TableRow, TableCell, BorderStyle } from 'docx';

export default function GenericReportConfig({ readOnly = false }: { readOnly?: boolean }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        primary_color: '#0F172A',
        secondary_color: '#3B82F6',
        font_family: 'Arial',
        header_text: '',
        footer_text: '',
        template_text: ''
    });

    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/medic/generic-report-config');
            if (res.ok) {
                const data = await res.json();
                if (data && data.id) {
                    setConfig(data);
                    setFormData({
                        primary_color: data.primary_color || '#0F172A',
                        secondary_color: data.secondary_color || '#3B82F6',
                        font_family: data.font_family || 'Arial',
                        header_text: data.header_text || '',
                        footer_text: data.footer_text || '',
                        template_text: data.template_text || ''
                    });
                    if (data.logo_url) {
                        setLogoPreview(data.logo_url);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading config:', error);
            toast.error('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamaño (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('La imagen es demasiado grande. Máximo 2MB.');
            return;
        }

        try {
            const toastId = toast.loading('Subiendo logo...');
            
            // Subir a bucket 'public' o 'logos'
            // Usamos un nombre único
            const fileExt = file.name.split('.').pop();
            const fileName = `report-logos/${Date.now()}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('logos') 
                .upload(fileName, file);

            if (error) throw error;

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(fileName);

            setLogoPreview(publicUrl);
            toast.dismiss(toastId);
            toast.success('Logo subido correctamente');

        } catch (error) {
            console.error('Error uploading logo:', error);
            toast.error('Error al subir el logo');
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                ...formData,
                logo_url: logoPreview
            };

            const res = await fetch('/api/medic/generic-report-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Error al guardar');

            const savedData = await res.json();
            setConfig(savedData);
            toast.success('Configuración guardada exitosamente');
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    const fonts = [
        { value: 'Arial', label: 'Arial (Sans-serif)' },
        { value: 'Times New Roman', label: 'Times New Roman (Serif)' },
        { value: 'Calibri', label: 'Calibri (Sans-serif)' },
        { value: 'Helvetica', label: 'Helvetica (Sans-serif)' },
        { value: 'Georgia', label: 'Georgia (Serif)' },
        { value: 'Verdana', label: 'Verdana (Sans-serif)' }
    ];



    const handleDownloadExample = async () => {
        try {
            const toastId = toast.loading('Generando documento...');

            // 1. Prepare Colors (Strict Hex)
            const cleanColor = (color: string) => {
                const c = color.replace('#', '');
                return c.length === 6 ? c : '000000';
            };
            const primaryColor = cleanColor(formData.primary_color);
            const secondaryColor = cleanColor(formData.secondary_color);
            const font = formData.font_family;

            // 2. Fetch logo if exists
            let logoImagePart: ImageRun | undefined;
            if (logoPreview) {
                try {
                    const response = await fetch(logoPreview);
                    const blob = await response.blob();
                    const buffer = await blob.arrayBuffer();
                    
                    // Detect type or default to png
                    const type = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png';
                    
                    logoImagePart = new ImageRun({
                        data: buffer,
                        transformation: { width: 100, height: 100 },
                        type: type, // Explicitly set type to fix lint/doc error
                    });
                } catch (err) {
                    console.error('Error fetching logo for doc:', err);
                    toast.error('No se pudo incluir el logo (error de descarga)');
                }
            }

            // 3. Create Document
            const doc = new Document({
                styles: {
                    default: {
                        document: {
                            run: {
                                font: font,
                                color: "000000",
                            },
                        },
                    },
                },
                sections: [{
                    properties: {
                         type: "nextPage", 
                         page: {
                             margin: { top: 720, right: 720, bottom: 720, left: 720 } // 0.5 inch margins
                         }
                    },
                    headers: {
                        default: new Header({
                            children: [
                                new Table({
                                    width: { size: 100, type: WidthType.PERCENTAGE },
                                    borders: {
                                        // Use simplified borders to avoid XML errors
                                        bottom: { style: BorderStyle.SINGLE, size: 12, color: secondaryColor }, 
                                        top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                        right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                    },
                                    rows: [
                                        new TableRow({
                                            children: [
                                                new TableCell({
                                                    children: [
                                                        new Paragraph({
                                                            children: logoImagePart ? [logoImagePart] : [],
                                                        }),
                                                    ],
                                                    width: { size: 20, type: WidthType.PERCENTAGE },
                                                    borders: { top: { style: BorderStyle.NONE, size: 0, color: "auto" }, bottom: { style: BorderStyle.NONE, size: 0, color: "auto" }, left: { style: BorderStyle.NONE, size: 0, color: "auto" }, right: { style: BorderStyle.NONE, size: 0, color: "auto" } },
                                                }),
                                                new TableCell({
                                                    children: [
                                                        new Paragraph({
                                                            children: [
                                                                new TextRun({
                                                                    text: formData.header_text || "Nombre del Doctor / Clínica",
                                                                    bold: true,
                                                                    size: 28, // 14pt
                                                                    color: primaryColor,
                                                                }),
                                                            ],
                                                            alignment: AlignmentType.RIGHT,
                                                        }),
                                                        new Paragraph({
                                                            children: [
                                                                new TextRun({
                                                                    text: new Date().toLocaleDateString(),
                                                                    size: 20, // 10pt
                                                                    color: "666666",
                                                                }),
                                                            ],
                                                            alignment: AlignmentType.RIGHT,
                                                        }),
                                                    ],
                                                    width: { size: 80, type: WidthType.PERCENTAGE },
                                                    verticalAlign: "center",
                                                    borders: { top: { style: BorderStyle.NONE, size: 0, color: "auto" }, bottom: { style: BorderStyle.NONE, size: 0, color: "auto" }, left: { style: BorderStyle.NONE, size: 0, color: "auto" }, right: { style: BorderStyle.NONE, size: 0, color: "auto" } },
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    },
                    footers: {
                        default: new Footer({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: formData.footer_text || "Dirección y Contacto",
                                            size: 16, // 8pt
                                            color: "666666",
                                        }),
                                    ],
                                    alignment: AlignmentType.CENTER,
                                    border: {
                                        top: { style: BorderStyle.SINGLE, size: 6, color: secondaryColor },
                                    },
                                    spacing: { before: 200 },
                                }),
                            ],
                        }),
                    },
                    children: [
                        // Title
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "INFORME MÉDICO",
                                    bold: true,
                                    size: 24, // 12pt
                                    color: primaryColor,
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400, before: 200 },
                        }),

                        // Patient Info
                        new Paragraph({
                            children: [
                                new TextRun({ text: "PACIENTE: ", bold: true, color: secondaryColor }),
                                new TextRun({ text: "Juan Pérez (Ejemplo)" }),
                            ],
                            spacing: { after: 100 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "CEDULA: ", bold: true, color: secondaryColor }),
                                new TextRun({ text: "V-12.345.678" }),
                            ],
                            spacing: { after: 100 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "EDAD: ", bold: true, color: secondaryColor }),
                                new TextRun({ text: "35 años" }),
                            ],
                            spacing: { after: 400 },
                        }),

                        // Content Sections
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "MOTIVO DE CONSULTA",
                                    bold: true,
                                    color: primaryColor,
                                }),
                            ],
                            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: secondaryColor } },
                            spacing: { before: 200, after: 100 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                                }),
                            ],
                            spacing: { after: 300 },
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "DIAGNÓSTICO",
                                    bold: true,
                                    color: primaryColor,
                                }),
                            ],
                            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: secondaryColor } },
                            spacing: { before: 200, after: 100 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
                                }),
                            ],
                            spacing: { after: 300 },
                        }),
                    ],
                }],
            });

            // 4. Generate and Download
            const blob = await Packer.toBlob(doc);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Ejemplo_Informe_${new Date().getTime()}.docx`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.dismiss(toastId);
            toast.success('Documento generado correctamente');

        } catch (error) {
            console.error('Error generating document:', error);
            toast.error('Error al generar el documento: ' + (error as Error).message);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <LayoutTemplate className="w-5 h-5 text-indigo-600" />
                            Diseño de Informe Genérico
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Personaliza la apariencia de tus informes médicos (colores, logo, fuentes).
                        </p>
                    </div>
                    {!readOnly && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar Cambios
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Controls */}
                    <div className="space-y-6">
                        
                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Logo del Consultorio / Médico</label>
                            <div className="flex items-center gap-4">
                                <div 
                                    className={`w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative group ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                    onClick={() => !readOnly && fileInputRef.current?.click()}
                                >
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-gray-400" />
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                                        <span className="text-xs text-transparent group-hover:text-white font-medium">Cambiar</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleLogoUpload}
                                        disabled={readOnly}
                                    />
                                    <button 
                                        onClick={() => !readOnly && fileInputRef.current?.click()}
                                        disabled={readOnly}
                                        className={`text-sm font-medium ${readOnly ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'}`}
                                    >
                                        Subir imagen
                                    </button>
                                    <p className="text-xs text-gray-500 mt-1">Recomendado: PNG transparente, máx 2MB.</p>
                                </div>
                            </div>
                        </div>

                        {/* Colors */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Palette className="w-4 h-4" /> Color Primario
                                </label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="color" 
                                        name="primary_color"
                                        value={formData.primary_color}
                                        onChange={handleInputChange}
                                        disabled={readOnly}
                                        className="h-10 w-16 p-1 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                    <span className="text-sm font-mono text-gray-500">{formData.primary_color}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Encabezados, títulos principales.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Color Secundario</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="color" 
                                        name="secondary_color"
                                        value={formData.secondary_color}
                                        onChange={handleInputChange}
                                        disabled={readOnly}
                                        className="h-10 w-16 p-1 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                    <span className="text-sm font-mono text-gray-500">{formData.secondary_color}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Detalles, líneas decorativas.</p>
                            </div>
                        </div>

                        {/* Typography */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <Type className="w-4 h-4" /> Tipografía
                            </label>
                            <select 
                                name="font_family"
                                value={formData.font_family}
                                onChange={handleInputChange}
                                disabled={readOnly}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                {fonts.map(font => (
                                    <option key={font.value} value={font.value}>{font.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Texts */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Texto del Encabezado (Opcional)</label>
                            <input 
                                type="text" 
                                name="header_text"
                                value={formData.header_text}
                                onChange={handleInputChange}
                                disabled={readOnly}
                                placeholder="Ej: Dr. Juan Pérez - Cardiología"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Texto del Pie de Página (Opcional)</label>
                            <textarea 
                                name="footer_text"
                                value={formData.footer_text}
                                onChange={handleInputChange}
                                disabled={readOnly}
                                placeholder="Ej: Av. Principal, Consultorio 101. Tel: 555-1234. Email: doctor@email.com"
                                rows={3}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Template Content */}
                        <div>
                             <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Contenido de la Plantilla
                                </label>
                                <button
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        template_text: `Motivo de Consulta
{{motivo}}

Diagnóstico
{{diagnostico}}

Plan / Tratamiento
{{plan}}`
                                    }))}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    Cargar Ejemplo
                                </button>
                             </div>
                             
                            <textarea 
                                name="template_text"
                                value={formData.template_text}
                                onChange={handleInputChange}
                                disabled={readOnly}
                                placeholder="Escribe tu plantilla aquí..."
                                rows={10}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Variables Disponibles:</p>
                                <div className="flex flex-wrap gap-2">
                                    {['{{paciente}}', '{{edad}}', '{{cedula}}', '{{fecha_consulta}}', '{{motivo}}', '{{diagnostico}}', '{{plan}}'].map(v => (
                                        <span key={v} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-500 font-mono select-all cursor-pointer hover:bg-gray-100" title="Click para copiar" onClick={() => {
                                            navigator.clipboard.writeText(v);
                                            toast.success('Variable copiada');
                                        }}>
                                            {v}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2">
                                    Nota: <code>{`{{plan}}`}</code>, <code>{`{{tratamiento}}`}</code> y <code>{`{{notas}}`}</code> muestran la misma información (Observaciones/Plan). Usa solo uno.
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Preview */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">Vista Previa Aproximada</h3>
                        
                        {/* A4 Document Simulation */}
                        <div 
                            className="bg-white shadow-2xl mx-auto p-6 relative flex flex-col overflow-hidden border border-gray-200"
                            style={{ 
                                width: '100%', 
                                maxWidth: '400px', 
                                aspectRatio: '210/297',
                                fontFamily: formData.font_family 
                            }}
                        >
                            {/* Header */}
                            <div className="border-b pb-3 mb-4 flex justify-between items-end" style={{ borderColor: formData.secondary_color }}>
                                <div className="flex-1">
                                    {logoPreview && (
                                        <div className="h-10 mb-2 relative w-32">
                                             <img src={logoPreview} alt="Logo Preview" className="h-full object-contain object-left" />
                                        </div>
                                    )}
                                    <div className="text-xs font-bold leading-tight" style={{ color: formData.primary_color }}>
                                        {formData.header_text || 'Nombre del Doctor / Clínica'}
                                    </div>
                                </div>
                                <div className="text-right text-[10px] text-gray-400">
                                    {new Date().toLocaleDateString()}
                                </div>
                            </div>

                            {/* Body Content Placeholder */}
                            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                                <h1 className="text-sm font-bold text-center mb-4 tracking-wider" style={{ color: formData.primary_color }}>INFORME MÉDICO</h1>
                                
                                <div className="text-[10px] space-y-1 text-gray-800 grid grid-cols-2 gap-x-4">
                                    <p><strong style={{ color: formData.secondary_color }}>Paciente:</strong> Juan Pérez</p>
                                    <p><strong style={{ color: formData.secondary_color }}>Edad:</strong> 35 años</p>
                                    <p><strong style={{ color: formData.secondary_color }}>Cédula:</strong> V-12.345.678</p>
                                    <p><strong style={{ color: formData.secondary_color }}>Fecha:</strong> {new Date().toLocaleDateString()}</p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-dashed border-gray-100">
                                    <h4 className="text-[11px] font-bold mb-1" style={{ color: formData.primary_color }}>Motivo de Consulta</h4>
                                    <p className="text-[10px] text-gray-600 leading-relaxed text-justify">
                                        Paciente masculino de 35 años que acude a consulta por presentar sintomatología respiratoria leve asociada a malestar general. Se realiza evaluación física completa.
                                    </p>
                                </div>

                                <div className="mt-2">
                                    <h4 className="text-[11px] font-bold mb-1" style={{ color: formData.primary_color }}>Diagnóstico</h4>
                                    <p className="text-[10px] text-gray-600 leading-relaxed text-justify">
                                        1. Rinofaringitis Aguda (J00).
                                        <br />
                                        Se observan signos de inflamación en mucosa faríngea. No se palpan adenopatías cervicales. Auscultación pulmonar: murmullo vesicular conservado sin agregados.
                                    </p>
                                </div>
                                
                                <div className="mt-2">
                                    <h4 className="text-[11px] font-bold mb-1" style={{ color: formData.primary_color }}>Plan / Tratamiento</h4>
                                    <ul className="text-[10px] text-gray-600 list-disc list-inside">
                                        <li>Reposo relativo por 48 horas.</li>
                                        <li>Hidratación abundante (2-3L diarios).</li>
                                        <li>Control de temperatura si es mayor a 38.5°C.</li>
                                    </ul>
                                </div>

                                {formData.template_text && (
                                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                                         <h4 className="text-[11px] font-bold mb-2 text-gray-400 uppercase tracking-widest text-center">Vista Previa Plantilla</h4>
                                         <div className="text-[10px] text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded border border-gray-100">
                                            {formData.template_text}
                                         </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="mt-auto pt-3 border-t text-center" style={{ borderColor: formData.secondary_color }}>
                                <p className="text-[8px] text-gray-400 whitespace-pre-line leading-tight">
                                    {formData.footer_text || 'Av. Principal, Edificio Médico, Piso 3, Consultorio 304.\nTel: (555) 123-4567 | Email: contacto@medic.com'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <button 
                                onClick={handleDownloadExample}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm"
                            >
                                <Download className="w-4 h-4" /> Descargar Ejemplo PDF/Word
                            </button>
                            <p className="text-xs text-gray-400 mt-2">La vista previa es aproximada.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
