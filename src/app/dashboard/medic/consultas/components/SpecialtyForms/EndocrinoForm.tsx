'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Activity, TrendingUp, Scale } from 'lucide-react';

export interface EndocrinoFormData {
	dmHistory?: {
		type?: string; // Tipo 1, Tipo 2, GDM
		yearsSinceDiagnosis?: number;
		complications?: string;
	};
	glycemias?: {
		fasting?: number;
		postprandial?: number;
		random?: number;
	};
	hba1c?: number;
	thyroid?: {
		tsh?: number;
		ft4?: number;
		symptoms?: string;
	};
	metabolic?: {
		weight?: number;
		bmi?: number;
		waist?: number; // Circunferencia de cintura
	};
	insulinSensitivity?: string;
}

interface EndocrinoFormProps {
	initialData?: Partial<EndocrinoFormData>;
	onChange: (data: EndocrinoFormData) => void;
}

export default function EndocrinoForm({ initialData, onChange }: EndocrinoFormProps) {
	const [formData, setFormData] = useState<EndocrinoFormData>(initialData || {});

	const updateFormData = (updates: Partial<EndocrinoFormData>) => {
		const newData = { ...formData, ...updates };
		setFormData(newData);
		onChange(newData);
	};

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Activity size={20} />
					Formulario de Endocrinología
				</h2>
			</div>

			{/* Antecedentes DM */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Antecedentes de Diabetes Mellitus</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="dmType">Tipo de DM</Label>
						<select id="dmType" value={formData.dmHistory?.type || ''} onChange={(e) => updateFormData({ dmHistory: { ...formData.dmHistory, type: e.target.value } })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
							<option value="">Seleccionar</option>
							<option value="Tipo 1">Tipo 1</option>
							<option value="Tipo 2">Tipo 2</option>
							<option value="GDM">Diabetes Gestacional (GDM)</option>
							<option value="Otro">Otro</option>
						</select>
					</div>
					<div>
						<Label htmlFor="dmYears">Años desde el diagnóstico</Label>
						<Input id="dmYears" type="number" value={formData.dmHistory?.yearsSinceDiagnosis || ''} onChange={(e) => updateFormData({ dmHistory: { ...formData.dmHistory, yearsSinceDiagnosis: e.target.value ? Number(e.target.value) : undefined } })} placeholder="Años" />
					</div>
					<div>
						<Label htmlFor="dmComplications">Complicaciones</Label>
						<Textarea id="dmComplications" value={formData.dmHistory?.complications || ''} onChange={(e) => updateFormData({ dmHistory: { ...formData.dmHistory, complications: e.target.value } })} placeholder="Retinopatía, nefropatía, neuropatía, etc." rows={2} />
					</div>
				</div>
			</Card>

			{/* Glicemias */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Glicemias</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<Label htmlFor="glycemiaFasting">Glicemia en Ayunas (mg/dL)</Label>
						<Input id="glycemiaFasting" type="number" step="0.1" value={formData.glycemias?.fasting || ''} onChange={(e) => updateFormData({ glycemias: { ...formData.glycemias, fasting: e.target.value ? Number(e.target.value) : undefined } })} placeholder="mg/dL" />
					</div>
					<div>
						<Label htmlFor="glycemiaPostprandial">Glicemia Postprandial (mg/dL)</Label>
						<Input id="glycemiaPostprandial" type="number" step="0.1" value={formData.glycemias?.postprandial || ''} onChange={(e) => updateFormData({ glycemias: { ...formData.glycemias, postprandial: e.target.value ? Number(e.target.value) : undefined } })} placeholder="mg/dL" />
					</div>
					<div>
						<Label htmlFor="glycemiaRandom">Glicemia Aleatoria (mg/dL)</Label>
						<Input id="glycemiaRandom" type="number" step="0.1" value={formData.glycemias?.random || ''} onChange={(e) => updateFormData({ glycemias: { ...formData.glycemias, random: e.target.value ? Number(e.target.value) : undefined } })} placeholder="mg/dL" />
					</div>
				</div>
			</Card>

			{/* HbA1c */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Hemoglobina Glicosilada (HbA1c)</h3>
				<div>
					<Label htmlFor="hba1c">HbA1c (%)</Label>
					<Input id="hba1c" type="number" step="0.1" value={formData.hba1c || ''} onChange={(e) => updateFormData({ hba1c: e.target.value ? Number(e.target.value) : undefined })} placeholder="%" />
				</div>
			</Card>

			{/* Función Tiroidea */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Función Tiroidea</h3>
				<div className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label htmlFor="tsh">TSH (mUI/L)</Label>
							<Input id="tsh" type="number" step="0.01" value={formData.thyroid?.tsh || ''} onChange={(e) => updateFormData({ thyroid: { ...formData.thyroid, tsh: e.target.value ? Number(e.target.value) : undefined } })} placeholder="mUI/L" />
						</div>
						<div>
							<Label htmlFor="ft4">FT4 (pmol/L)</Label>
							<Input id="ft4" type="number" step="0.1" value={formData.thyroid?.ft4 || ''} onChange={(e) => updateFormData({ thyroid: { ...formData.thyroid, ft4: e.target.value ? Number(e.target.value) : undefined } })} placeholder="pmol/L" />
						</div>
					</div>
					<div>
						<Label htmlFor="thyroidSymptoms">Síntomas Tiroideos</Label>
						<Textarea id="thyroidSymptoms" value={formData.thyroid?.symptoms || ''} onChange={(e) => updateFormData({ thyroid: { ...formData.thyroid, symptoms: e.target.value } })} placeholder="Intolerancia al frío/calor, cambios de peso, palpitaciones, etc." rows={2} />
					</div>
				</div>
			</Card>

			{/* Registro Metabólico */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<Scale size={18} />
					Registro Metabólico
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<Label htmlFor="metabolicWeight">Peso (kg)</Label>
						<Input id="metabolicWeight" type="number" step="0.1" value={formData.metabolic?.weight || ''} onChange={(e) => updateFormData({ metabolic: { ...formData.metabolic, weight: e.target.value ? Number(e.target.value) : undefined } })} placeholder="kg" />
					</div>
					<div>
						<Label htmlFor="metabolicBMI">IMC</Label>
						<Input id="metabolicBMI" type="number" step="0.1" value={formData.metabolic?.bmi || ''} onChange={(e) => updateFormData({ metabolic: { ...formData.metabolic, bmi: e.target.value ? Number(e.target.value) : undefined } })} placeholder="kg/m²" />
					</div>
					<div>
						<Label htmlFor="metabolicWaist">Circunferencia de Cintura (cm)</Label>
						<Input id="metabolicWaist" type="number" step="0.1" value={formData.metabolic?.waist || ''} onChange={(e) => updateFormData({ metabolic: { ...formData.metabolic, waist: e.target.value ? Number(e.target.value) : undefined } })} placeholder="cm" />
					</div>
				</div>
			</Card>

			{/* Sensibilidad a la Insulina */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Sensibilidad a la Insulina</h3>
				<div>
					<Label htmlFor="insulinSensitivity">Evaluación</Label>
					<Textarea id="insulinSensitivity" value={formData.insulinSensitivity || ''} onChange={(e) => updateFormData({ insulinSensitivity: e.target.value })} placeholder="Resistencia a la insulina, síndrome metabólico, etc." rows={2} />
				</div>
			</Card>
		</div>
	);
}

