'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Eye } from 'lucide-react';

export interface OftalmoFormData {
	glasses?: {
		uses?: boolean;
		prescription?: string;
	};
	previousSurgeries?: string;
	visualAcuity?: {
		od?: string; // Ojo Derecho
		oi?: string; // Ojo Izquierdo
		withCorrection?: {
			od?: string;
			oi?: string;
		};
	};
	pio?: {
		od?: number; // Presión Intraocular
		oi?: number;
	};
	refraction?: {
		od?: string;
		oi?: string;
	};
	anteriorSegment?: {
		od?: string;
		oi?: string;
	};
	posteriorSegment?: {
		od?: string;
		oi?: string;
	};
	motility?: string;
}

interface OftalmoFormProps {
	initialData?: Partial<OftalmoFormData>;
	onChange: (data: OftalmoFormData) => void;
}

export default function OftalmoForm({ initialData, onChange }: OftalmoFormProps) {
	const [formData, setFormData] = useState<OftalmoFormData>(initialData || {});

	const updateFormData = (updates: Partial<OftalmoFormData>) => {
		const newData = { ...formData, ...updates };
		setFormData(newData);
		onChange(newData);
	};

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Eye size={20} />
					Formulario de Oftalmología
				</h2>
			</div>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Uso de Lentes</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.glasses?.uses || false} onChange={(e) => updateFormData({ glasses: { ...formData.glasses, uses: e.target.checked } })} className="rounded" />
						<span className="text-sm">Usa lentes</span>
					</label>
					{formData.glasses?.uses && (
						<div>
							<Label htmlFor="glassesPrescription">Prescripción</Label>
							<Input id="glassesPrescription" value={formData.glasses?.prescription || ''} onChange={(e) => updateFormData({ glasses: { ...formData.glasses, prescription: e.target.value } })} placeholder="Ej: -2.50 esf, -1.00 cil" />
						</div>
					)}
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Cirugías Previas</h3>
				<div>
					<Label htmlFor="previousSurgeries">Historial de Cirugías Oculares</Label>
					<Textarea id="previousSurgeries" value={formData.previousSurgeries || ''} onChange={(e) => updateFormData({ previousSurgeries: e.target.value })} placeholder="Cataratas, LASIK, etc." rows={2} />
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Agudeza Visual</h3>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="vaOD">OD (Ojo Derecho)</Label>
							<Input id="vaOD" value={formData.visualAcuity?.od || ''} onChange={(e) => updateFormData({ visualAcuity: { ...formData.visualAcuity, od: e.target.value } })} placeholder="Ej: 20/20" />
						</div>
						<div>
							<Label htmlFor="vaOI">OI (Ojo Izquierdo)</Label>
							<Input id="vaOI" value={formData.visualAcuity?.oi || ''} onChange={(e) => updateFormData({ visualAcuity: { ...formData.visualAcuity, oi: e.target.value } })} placeholder="Ej: 20/20" />
						</div>
					</div>
					<div>
						<Label className="text-sm font-medium">Con Corrección</Label>
						<div className="grid grid-cols-2 gap-4 mt-2">
							<div>
								<Label htmlFor="vaODCorrected" className="text-xs">OD Corregido</Label>
								<Input id="vaODCorrected" value={formData.visualAcuity?.withCorrection?.od || ''} onChange={(e) => updateFormData({ visualAcuity: { ...formData.visualAcuity, withCorrection: { ...formData.visualAcuity?.withCorrection, od: e.target.value } } })} placeholder="Ej: 20/20" />
							</div>
							<div>
								<Label htmlFor="vaOICorrected" className="text-xs">OI Corregido</Label>
								<Input id="vaOICorrected" value={formData.visualAcuity?.withCorrection?.oi || ''} onChange={(e) => updateFormData({ visualAcuity: { ...formData.visualAcuity, withCorrection: { ...formData.visualAcuity?.withCorrection, oi: e.target.value } } })} placeholder="Ej: 20/20" />
							</div>
						</div>
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Presión Intraocular (PIO)</h3>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="pioOD">OD (mmHg)</Label>
						<Input id="pioOD" type="number" step="0.1" value={formData.pio?.od || ''} onChange={(e) => updateFormData({ pio: { ...formData.pio, od: e.target.value ? Number(e.target.value) : undefined } })} placeholder="mmHg" />
					</div>
					<div>
						<Label htmlFor="pioOI">OI (mmHg)</Label>
						<Input id="pioOI" type="number" step="0.1" value={formData.pio?.oi || ''} onChange={(e) => updateFormData({ pio: { ...formData.pio, oi: e.target.value ? Number(e.target.value) : undefined } })} placeholder="mmHg" />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Refracción</h3>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="refractionOD">OD</Label>
						<Input id="refractionOD" value={formData.refraction?.od || ''} onChange={(e) => updateFormData({ refraction: { ...formData.refraction, od: e.target.value } })} placeholder="Esf, Cil, Eje" />
					</div>
					<div>
						<Label htmlFor="refractionOI">OI</Label>
						<Input id="refractionOI" value={formData.refraction?.oi || ''} onChange={(e) => updateFormData({ refraction: { ...formData.refraction, oi: e.target.value } })} placeholder="Esf, Cil, Eje" />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Segmento Anterior</h3>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="anteriorOD">OD</Label>
						<Textarea id="anteriorOD" value={formData.anteriorSegment?.od || ''} onChange={(e) => updateFormData({ anteriorSegment: { ...formData.anteriorSegment, od: e.target.value } })} placeholder="Córnea, iris, cámara anterior" rows={2} />
					</div>
					<div>
						<Label htmlFor="anteriorOI">OI</Label>
						<Textarea id="anteriorOI" value={formData.anteriorSegment?.oi || ''} onChange={(e) => updateFormData({ anteriorSegment: { ...formData.anteriorSegment, oi: e.target.value } })} placeholder="Córnea, iris, cámara anterior" rows={2} />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Segmento Posterior</h3>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="posteriorOD">OD</Label>
						<Textarea id="posteriorOD" value={formData.posteriorSegment?.od || ''} onChange={(e) => updateFormData({ posteriorSegment: { ...formData.posteriorSegment, od: e.target.value } })} placeholder="Retina, mácula, papila" rows={2} />
					</div>
					<div>
						<Label htmlFor="posteriorOI">OI</Label>
						<Textarea id="posteriorOI" value={formData.posteriorSegment?.oi || ''} onChange={(e) => updateFormData({ posteriorSegment: { ...formData.posteriorSegment, oi: e.target.value } })} placeholder="Retina, mácula, papila" rows={2} />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Motilidad Ocular</h3>
				<div>
					<Label htmlFor="motility">Evaluación de Motilidad</Label>
					<Textarea id="motility" value={formData.motility || ''} onChange={(e) => updateFormData({ motility: e.target.value })} placeholder="Movimientos oculares, estrabismo" rows={2} />
				</div>
			</Card>
		</div>
	);
}

