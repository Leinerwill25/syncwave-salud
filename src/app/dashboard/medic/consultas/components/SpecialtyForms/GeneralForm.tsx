'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Heart, Brain, Eye, Activity, HeartPulse } from 'lucide-react';

export interface GeneralFormData {
	systemsChecklist?: {
		cardiovascular?: boolean;
		respiratory?: boolean;
		digestive?: boolean;
		neurological?: boolean;
		genitourinary?: boolean;
		musculoskeletal?: boolean;
		endocrine?: boolean;
		hematologic?: boolean;
		lymphatic?: boolean;
		skin?: boolean;
	};
	pain?: {
		location?: string;
		radiation?: string;
		eva?: number; // Escala Visual Analógica 0-10
	};
	infectionSigns?: {
		fever?: boolean;
		chills?: boolean;
		malaise?: boolean;
		lymphadenopathy?: boolean;
	};
	physicalExam?: {
		general?: string;
		head?: string;
		neck?: string;
		chest?: string;
		abdomen?: string;
		extremities?: string;
		neurological?: string;
	};
}

interface GeneralFormProps {
	initialData?: Partial<GeneralFormData>;
	onChange: (data: GeneralFormData) => void;
}

export default function GeneralForm({ initialData, onChange }: GeneralFormProps) {
	const [formData, setFormData] = useState<GeneralFormData>({
		systemsChecklist: initialData?.systemsChecklist || {},
		pain: initialData?.pain || {},
		infectionSigns: initialData?.infectionSigns || {},
		physicalExam: initialData?.physicalExam || {},
	});

	const updateFormData = (updates: Partial<GeneralFormData>) => {
		const newData = { ...formData, ...updates };
		setFormData(newData);
		onChange(newData);
	};

	const systems = [
		{ key: 'cardiovascular', label: 'Cardiovascular', icon: Heart },
		{ key: 'respiratory', label: 'Respiratorio', icon: HeartPulse },
		{ key: 'digestive', label: 'Digestivo', icon: Activity },
		{ key: 'neurological', label: 'Neurológico', icon: Brain },
		{ key: 'genitourinary', label: 'Genitourinario', icon: Activity },
		{ key: 'musculoskeletal', label: 'Musculoesquelético', icon: Activity },
		{ key: 'endocrine', label: 'Endocrino', icon: Activity },
		{ key: 'hematologic', label: 'Hematológico', icon: Activity },
		{ key: 'lymphatic', label: 'Linfático', icon: Activity },
		{ key: 'skin', label: 'Piel y Anexos', icon: Activity },
	];

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Stethoscope size={20} />
					Formulario de Medicina General
				</h2>
			</div>

			{/* Checklist por Sistemas */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Revisión por Sistemas</h3>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
					{systems.map((system) => {
						const Icon = system.icon;
						return (
							<label key={system.key} className="flex items-center gap-2 p-3 rounded-lg border border-blue-200 hover:bg-blue-50 cursor-pointer">
								<input
									type="checkbox"
									checked={formData.systemsChecklist?.[system.key as keyof typeof formData.systemsChecklist] || false}
									onChange={(e) => {
										updateFormData({
											systemsChecklist: {
												...formData.systemsChecklist,
												[system.key]: e.target.checked,
											},
										});
									}}
									className="rounded"
								/>
								<Icon size={16} className="text-slate-600" />
								<span className="text-sm">{system.label}</span>
							</label>
						);
					})}
				</div>
			</Card>

			{/* Dolor */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Evaluación del Dolor</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="painLocation">Localización del Dolor</Label>
						<Input id="painLocation" value={formData.pain?.location || ''} onChange={(e) => updateFormData({ pain: { ...formData.pain, location: e.target.value } })} placeholder="Ej: epigastrio, región lumbar" />
					</div>
					<div>
						<Label htmlFor="painRadiation">Irradiación</Label>
						<Input id="painRadiation" value={formData.pain?.radiation || ''} onChange={(e) => updateFormData({ pain: { ...formData.pain, radiation: e.target.value } })} placeholder="Ej: hacia brazo izquierdo, hacia espalda" />
					</div>
					<div>
						<Label htmlFor="painEVA">Escala Visual Analógica (EVA) 0-10</Label>
						<div className="flex items-center gap-3">
							<Input id="painEVA" type="number" min="0" max="10" step="0.5" value={formData.pain?.eva || ''} onChange={(e) => updateFormData({ pain: { ...formData.pain, eva: e.target.value ? Number(e.target.value) : undefined } })} placeholder="0-10" className="w-24" />
							{formData.pain?.eva !== undefined && (
								<div className="flex-1">
									<div className="h-2 bg-slate-200 rounded-full overflow-hidden">
										<div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" style={{ width: `${(formData.pain.eva / 10) * 100}%` }} />
									</div>
									<p className="text-xs text-slate-600 mt-1">Intensidad: {formData.pain.eva}/10</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</Card>

			{/* Signos de Infección */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Signos de Infección</h3>
				<div className="space-y-2">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.infectionSigns?.fever || false} onChange={(e) => updateFormData({ infectionSigns: { ...formData.infectionSigns, fever: e.target.checked } })} className="rounded" />
						<span className="text-sm">Fiebre</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.infectionSigns?.chills || false} onChange={(e) => updateFormData({ infectionSigns: { ...formData.infectionSigns, chills: e.target.checked } })} className="rounded" />
						<span className="text-sm">Escalofríos</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.infectionSigns?.malaise || false} onChange={(e) => updateFormData({ infectionSigns: { ...formData.infectionSigns, malaise: e.target.checked } })} className="rounded" />
						<span className="text-sm">Malestar General</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.infectionSigns?.lymphadenopathy || false} onChange={(e) => updateFormData({ infectionSigns: { ...formData.infectionSigns, lymphadenopathy: e.target.checked } })} className="rounded" />
						<span className="text-sm">Adenopatías</span>
					</label>
				</div>
			</Card>

			{/* Examen Físico General */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Examen Físico General</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="examGeneral">Estado General</Label>
						<Textarea id="examGeneral" value={formData.physicalExam?.general || ''} onChange={(e) => updateFormData({ physicalExam: { ...formData.physicalExam, general: e.target.value } })} placeholder="Aspecto general, estado de conciencia, hidratación" rows={2} />
					</div>
					<div>
						<Label htmlFor="examHead">Cabeza y Cuello</Label>
						<Textarea id="examHead" value={formData.physicalExam?.head || ''} onChange={(e) => updateFormData({ physicalExam: { ...formData.physicalExam, head: e.target.value } })} placeholder="Inspección de cabeza, cuello, tiroides" rows={2} />
					</div>
					<div>
						<Label htmlFor="examChest">Tórax</Label>
						<Textarea id="examChest" value={formData.physicalExam?.chest || ''} onChange={(e) => updateFormData({ physicalExam: { ...formData.physicalExam, chest: e.target.value } })} placeholder="Inspección, palpación, percusión, auscultación" rows={2} />
					</div>
					<div>
						<Label htmlFor="examAbdomen">Abdomen</Label>
						<Textarea id="examAbdomen" value={formData.physicalExam?.abdomen || ''} onChange={(e) => updateFormData({ physicalExam: { ...formData.physicalExam, abdomen: e.target.value } })} placeholder="Inspección, auscultación, palpación, percusión" rows={2} />
					</div>
					<div>
						<Label htmlFor="examExtremities">Extremidades</Label>
						<Textarea id="examExtremities" value={formData.physicalExam?.extremities || ''} onChange={(e) => updateFormData({ physicalExam: { ...formData.physicalExam, extremities: e.target.value } })} placeholder="Inspección, movilidad, pulsos" rows={2} />
					</div>
					<div>
						<Label htmlFor="examNeurological">Examen Neurológico</Label>
						<Textarea id="examNeurological" value={formData.physicalExam?.neurological || ''} onChange={(e) => updateFormData({ physicalExam: { ...formData.physicalExam, neurological: e.target.value } })} placeholder="Reflejos, sensibilidad, fuerza, coordinación" rows={2} />
					</div>
				</div>
			</Card>
		</div>
	);
}
