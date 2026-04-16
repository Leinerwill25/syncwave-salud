'use client';

import React, { useMemo } from 'react';
import { FileText, Eye, AlertCircle } from 'lucide-react';

interface PatientInfo {
	firstName: string;
	lastName: string;
	identifier: string;
	dob: string;
	age: number | null;
	email?: string;
	phone?: string;
}

interface ReportPreviewPaneProps {
	patient: PatientInfo;
	consultationDate: string;
	content: string; // Bloque clínico generado
	doctorName: string;
	doctorSpecialty: string;
	isVisible: boolean;
	onToggle: () => void;
}

export default function ReportPreviewPane({
	patient,
	consultationDate,
	content,
	doctorName,
	doctorSpecialty,
	isVisible,
	onToggle
}: ReportPreviewPaneProps) {
	
	const formattedDate = useMemo(() => {
		if (!consultationDate) return new Date().toLocaleDateString('es-VE');
		const d = new Date(consultationDate);
		return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}, [consultationDate]);

	// Procesar contenido para resaltar campos vacíos
	const processedContent = useMemo(() => {
		if (!content) return null;
		
		// Dividir por líneas para procesar
		return content.split('\n').map((line, idx) => {
			if (!line.trim()) return <div key={idx} className="h-4" />;
			
			// Si la línea tiene un valor vacío (ej: "FUR: ")
			// Buscamos patrones de [Campo]: [Valor]
			const parts = line.split(':');
			if (parts.length > 1) {
				const label = parts[0];
				const value = parts.slice(1).join(':').trim();
				
				if (!value) {
					return (
						<div key={idx} className="flex gap-1 items-baseline">
							<span className="font-bold text-slate-800">{label}:</span>
							<span className="bg-slate-100 text-slate-400 text-[10px] italic px-1.5 rounded border border-dashed border-slate-300">completar...</span>
						</div>
					);
				}
				
				return (
					<div key={idx} className="flex gap-1 items-baseline">
						<span className="font-bold text-slate-800">{label}:</span>
						<span className="text-[#0F6E56] font-medium">{value}</span>
					</div>
				);
			}
			
			// Títulos de secciones (todo en mayúsculas)
			if (line === line.toUpperCase() && line.length > 3) {
				return (
					<h4 key={idx} className="mt-4 mb-2 font-black text-slate-900 border-b border-slate-100 pb-1 text-xs tracking-wider">
						{line}
					</h4>
				);
			}

			return <p key={idx} className="text-slate-700 leading-relaxed text-[13px]">{line}</p>;
		});
	}, [content]);

	if (!isVisible) {
		return (
			<button 
				onClick={onToggle}
				className="fixed bottom-24 right-8 bg-white border border-slate-200 shadow-xl rounded-full p-4 text-teal-600 hover:scale-110 transition-transform z-30 flex items-center gap-2 font-bold"
			>
				<Eye size={20} />
				<span className="hidden md:inline">Ver Vista Previa</span>
			</button>
		);
	}

	return (
		<div className="w-[45%] h-screen bg-slate-200 p-8 flex flex-col gap-4 animate-in slide-in-from-right duration-300 sticky top-0 overflow-hidden">
			<div className="flex items-center justify-between shrink-0">
				<div className="flex items-center gap-2 text-slate-600 font-bold text-sm uppercase tracking-widest">
					<FileText size={18} />
					Vista Previa del Informe
				</div>
				<button 
					onClick={onToggle}
					className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-300 transition-colors"
				>
					<Eye size={20} />
				</button>
			</div>

			{/* Mock Document */}
			<div className="flex-1 bg-white shadow-2xl rounded-sm p-[40px] overflow-y-auto scrollbar-hide flex flex-col font-serif">
				{/* Doctor Header Representation */}
				<div className="border-b-[4px] border-[#64223F] pb-4 mb-8 flex justify-between items-end">
					<div>
						<h2 className="text-xl font-black text-slate-900 leading-tight tracking-tight uppercase">
							{doctorName || 'Dr. Médico Especialista'}
						</h2>
						<p className="text-[11px] text-[#64223F] font-bold tracking-[2px] uppercase">
							{doctorSpecialty || 'Especialidad Médica'}
						</p>
					</div>
					<div className="text-[10px] text-slate-400 text-right uppercase font-sans font-bold translate-y-1">
						Logo institucional
					</div>
				</div>

				{/* Document Metadata Grid */}
				<div className="grid grid-cols-2 gap-y-1.5 text-[11px] mb-8 font-sans uppercase">
					<div className="font-bold text-slate-500">FECHA: <span className="text-slate-900 ml-1">{formattedDate}</span></div>
					<div className="font-bold text-slate-500 text-right">EDAD: <span className="text-slate-900 ml-1">{patient.age} AÑOS</span></div>
					<div className="font-bold text-slate-500">PACIENTE: <span className="text-slate-900 ml-1">{patient.firstName} {patient.lastName}</span></div>
					<div className="font-bold text-slate-500 text-right">CÉDULA: <span className="text-slate-900 ml-1">{patient.identifier}</span></div>
					<div className="font-bold text-slate-500">CORREO: <span className="text-slate-900 ml-1">{patient.email || '—'}</span></div>
					<div className="font-bold text-slate-500 text-right">TELÉFONO: <span className="text-slate-900 ml-1">{patient.phone || '—'}</span></div>
				</div>

				{/* Document Title */}
				<h3 className="text-center font-black text-base mb-8 underline underline-offset-[6px] decoration-slate-900 uppercase">
					INFORME MÉDICO GINECOLÓGICO
				</h3>

				{/* Clinical Content */}
				<div className="flex-1 space-y-1 font-sans text-[13px] text-justify">
					{content ? processedContent : (
						<div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 border-4 border-dashed border-slate-50 rounded-3xl opacity-50">
							<AlertCircle size={48} strokeWidth={1} />
							<p className="text-sm font-black tracking-widest uppercase">Sin información clínica</p>
						</div>
					)}
				</div>

				{/* Static Template Note */}
				<div className="mt-auto pt-10 border-t border-slate-100 italic text-[10px] text-slate-400 font-sans leading-tight">
					<div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-yellow-800 not-italic mb-4">
						<p className="font-black text-[9px] mb-1 uppercase tracking-widest">Nota Importante:</p>
						<p className="text-[10px]">Cualquier anomalía o sintomatología fuera de lo habitual debe ser notificada de inmediato. Este informe es una representación digital y no sustituye la evaluación presencial continua.</p>
					</div>
					<p className="text-center">Firma electrónica y sello digital del profesional</p>
				</div>
			</div>
		</div>
	);
}
