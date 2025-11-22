'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Smile } from 'lucide-react';
import Odontogram, { OdontogramData } from '../Odontogram/Odontogram';

export interface OdontoFormData {
	motive?: string;
	habits?: {
		bruxism?: boolean;
		tobacco?: boolean;
	};
	lastVisit?: string;
	hygiene?: string;
	toothEvaluation?: string; // Evaluación por pieza dental
	gums?: string; // Encías
	mucosa?: string; // Mucosa
	odontogram?: OdontogramData;
}

interface OdontoFormProps {
	initialData?: Partial<OdontoFormData>;
	onChange: (data: OdontoFormData) => void;
}

export default function OdontoForm({ initialData, onChange }: OdontoFormProps) {
	const [formData, setFormData] = useState<OdontoFormData>(initialData || {});

	const updateFormData = (updates: Partial<OdontoFormData>) => {
		const newData = { ...formData, ...updates };
		setFormData(newData);
		onChange(newData);
	};

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Smile size={20} />
					Formulario de Odontología
				</h2>
			</div>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Motivo de Consulta Odontológica</h3>
				<div>
					<Label htmlFor="motive">Motivo</Label>
					<Textarea id="motive" value={formData.motive || ''} onChange={(e) => updateFormData({ motive: e.target.value })} placeholder="Dolor, caries, limpieza, ortodoncia, etc." rows={3} />
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Hábitos</h3>
				<div className="space-y-3">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.habits?.bruxism || false} onChange={(e) => updateFormData({ habits: { ...formData.habits, bruxism: e.target.checked } })} className="rounded" />
						<span className="text-sm">Bruxismo</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.habits?.tobacco || false} onChange={(e) => updateFormData({ habits: { ...formData.habits, tobacco: e.target.checked } })} className="rounded" />
						<span className="text-sm">Tabaco</span>
					</label>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Historial</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="lastVisit">Última Visita Odontológica</Label>
						<Input id="lastVisit" type="date" value={formData.lastVisit || ''} onChange={(e) => updateFormData({ lastVisit: e.target.value })} />
					</div>
					<div>
						<Label htmlFor="hygiene">Hábitos de Higiene</Label>
						<Textarea id="hygiene" value={formData.hygiene || ''} onChange={(e) => updateFormData({ hygiene: e.target.value })} placeholder="Frecuencia de cepillado, uso de hilo dental, enjuague bucal" rows={2} />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Evaluación por Pieza Dental</h3>
				<div>
					<Label htmlFor="toothEvaluation">Evaluación</Label>
					<Textarea id="toothEvaluation" value={formData.toothEvaluation || ''} onChange={(e) => updateFormData({ toothEvaluation: e.target.value })} placeholder="Estado de cada pieza dental, caries, restauraciones, ausencias" rows={4} />
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Encías y Mucosa</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="gums">Encías</Label>
						<Textarea id="gums" value={formData.gums || ''} onChange={(e) => updateFormData({ gums: e.target.value })} placeholder="Estado de las encías, sangrado, inflamación, recesión" rows={2} />
					</div>
					<div>
						<Label htmlFor="mucosa">Mucosa Oral</Label>
						<Textarea id="mucosa" value={formData.mucosa || ''} onChange={(e) => updateFormData({ mucosa: e.target.value })} placeholder="Estado de la mucosa, lesiones, úlceras" rows={2} />
					</div>
				</div>
			</Card>

			{/* Odontogram */}
			<Odontogram
				initialData={formData.odontogram}
				onChange={(odontogramData) => updateFormData({ odontogram: odontogramData })}
			/>
		</div>
	);
}

