'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { User, Stethoscope, Lock, Image as ImgIcon } from 'lucide-react';

interface ConsultationDataDisplayProps {
	vitals?: any;
	initialPatientData?: any;
	specialtyData?: any;
	privateNotes?: string;
	images?: any[];
}

export default function ConsultationDataDisplay({ vitals, initialPatientData, specialtyData, privateNotes, images }: ConsultationDataDisplayProps) {
	const vitalsObj = typeof vitals === 'string' ? JSON.parse(vitals) : vitals || {};

	// Extract images from vitals if they exist
	const consultationImages = vitalsObj.images || images || [];

	return (
		<div className="space-y-6">
			{/* Initial Patient Data */}
			{initialPatientData && (
				<Card className="p-5">
					<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
						<User size={18} />
						Datos Iniciales del Paciente
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{initialPatientData.firstName && (
							<div className="min-w-0">
								<span className="text-xs text-slate-600">Nombre</span>
								<p className="text-sm font-medium text-slate-900 break-words overflow-wrap-anywhere">
									{initialPatientData.firstName} {initialPatientData.lastName}
								</p>
							</div>
						)}
						{initialPatientData.identifier && (
							<div className="min-w-0">
								<span className="text-xs text-slate-600">Cédula/ID</span>
								<p className="text-sm font-medium text-slate-900 break-words">{initialPatientData.identifier}</p>
							</div>
						)}
						{initialPatientData.allergies && (
							<div className="md:col-span-2 min-w-0">
								<span className="text-xs text-slate-600">Alergias</span>
								<p className="text-sm text-slate-900 break-words overflow-wrap-anywhere whitespace-pre-wrap">{initialPatientData.allergies}</p>
							</div>
						)}
						{initialPatientData.currentMedication && (
							<div className="md:col-span-2 min-w-0">
								<span className="text-xs text-slate-600">Medicación Habitual</span>
								<p className="text-sm text-slate-900 break-words overflow-wrap-anywhere whitespace-pre-wrap">{initialPatientData.currentMedication}</p>
							</div>
						)}
					</div>
				</Card>
			)}

			{/* Specialty Data */}
			{specialtyData && Object.keys(specialtyData).length > 0 && (
				<Card className="p-5">
					<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
						<Stethoscope size={18} />
						Datos Especializados
					</h3>
					<div className="space-y-4">
						{Object.entries(specialtyData).map(([key, value]) => {
							if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return null;
							
							// Manejo especial para obstetrics con first_trimester y second_third_trimester
							if (key === 'obstetrics' && typeof value === 'object' && value !== null) {
								const obstetricsData = value as any;
								return (
									<div key={key} className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
										<h4 className="text-sm font-semibold text-slate-900 mb-3 capitalize">
											{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
										</h4>
										{obstetricsData.report_type && (
											<div className="mb-3">
												<span className="text-xs text-slate-600">Report Type</span>
												<p className="text-sm font-medium text-slate-900">{obstetricsData.report_type}</p>
											</div>
										)}
										{obstetricsData.first_trimester && (
											<div className="mb-4 border-l-4 border-teal-500 pl-3">
												<h5 className="text-xs font-semibold text-teal-700 mb-2">First Trimester</h5>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
													{Object.entries(obstetricsData.first_trimester).map(([fieldKey, fieldValue]) => {
														if (fieldValue === null || fieldValue === undefined || fieldValue === '') return null;
														return (
															<div key={fieldKey} className="min-w-0">
																<span className="text-xs text-slate-600 capitalize block">
																	{fieldKey.replace(/_/g, ' ')}
																</span>
																<p className="text-sm font-medium text-slate-900 break-words">
																	{String(fieldValue)}
																</p>
															</div>
														);
													})}
												</div>
											</div>
										)}
										{obstetricsData.second_third_trimester && (
											<div className="mb-4 border-l-4 border-cyan-500 pl-3">
												<h5 className="text-xs font-semibold text-cyan-700 mb-2">Second Third Trimester</h5>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
													{Object.entries(obstetricsData.second_third_trimester).map(([fieldKey, fieldValue]) => {
														if (fieldValue === null || fieldValue === undefined || fieldValue === '') return null;
														return (
															<div key={fieldKey} className="min-w-0">
																<span className="text-xs text-slate-600 capitalize block">
																	{fieldKey.replace(/_/g, ' ')}
																</span>
																<p className="text-sm font-medium text-slate-900 break-words">
																	{String(fieldValue)}
																</p>
															</div>
														);
													})}
												</div>
											</div>
										)}
										{/* Otros campos de obstetrics que no sean first_trimester o second_third_trimester */}
										{Object.entries(obstetricsData)
											.filter(([k]) => k !== 'first_trimester' && k !== 'second_third_trimester' && k !== 'report_type')
											.map(([fieldKey, fieldValue]) => {
												if (fieldValue === null || fieldValue === undefined || fieldValue === '') return null;
												return (
													<div key={fieldKey} className="mb-2">
														<span className="text-xs text-slate-600 capitalize block">
															{fieldKey.replace(/_/g, ' ')}
														</span>
														<p className="text-sm font-medium text-slate-900 break-words">
															{String(fieldValue)}
														</p>
													</div>
												);
											})}
									</div>
								);
							}
							
							// Renderizado normal para otros tipos de datos
							const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
							const isLongText = valueStr.length > 100;
							
							return (
								<div key={key} className="border-b border-blue-100 pb-2 min-w-0">
									<span className="text-xs text-slate-600 capitalize block mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
									{typeof value === 'object' ? (
										<pre className={`text-sm text-slate-900 mt-1 whitespace-pre-wrap break-words overflow-wrap-anywhere ${isLongText ? 'max-h-96 overflow-y-auto p-2 bg-slate-50 rounded border border-slate-200' : ''}`}>
											{valueStr}
										</pre>
									) : (
										<p className={`text-sm text-slate-900 break-words overflow-wrap-anywhere ${isLongText ? 'whitespace-pre-wrap' : ''}`}>
											{valueStr}
										</p>
									)}
								</div>
							);
						})}
					</div>
				</Card>
			)}

			{/* Private Notes (Psychiatry) */}
			{privateNotes && (
				<Card className="p-5 border-2 border-amber-200 bg-amber-50 min-w-0">
					<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
						<Lock size={18} className="text-amber-600" />
						Notas Privadas (NO visibles al paciente)
					</h3>
					<p className="text-sm text-slate-900 whitespace-pre-wrap break-words overflow-wrap-anywhere">{privateNotes}</p>
				</Card>
			)}

			{/* Images */}
			{consultationImages.length > 0 && (
				<Card className="p-5">
					<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
						<ImgIcon size={18} />
						Imágenes Adjuntas ({consultationImages.length})
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						{consultationImages.map((image: any, index: number) => (
							<div key={index} className="relative border border-blue-200 rounded-lg overflow-hidden bg-white">
								{image.type?.startsWith('image/') ? (
									<img src={image.url} alt={image.name || `Imagen ${index + 1}`} className="w-full h-32 object-cover" />
								) : (
									<div className="w-full h-32 flex items-center justify-center bg-slate-100">
										<ImgIcon size={32} className="text-slate-400" />
									</div>
								)}
								<div className="p-2 bg-white">
									<p className="text-xs text-slate-700 truncate" title={image.name}>
										{image.name || `Archivo ${index + 1}`}
									</p>
								</div>
							</div>
						))}
					</div>
				</Card>
			)}
		</div>
	);
}

