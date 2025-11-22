'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Brain, AlertTriangle } from 'lucide-react';

export interface NeuroFormData {
	seizures?: {
		present?: boolean;
		type?: string;
		frequency?: string;
		lastEpisode?: string;
	};
	headaches?: {
		present?: boolean;
		type?: string;
		frequency?: string;
		characteristics?: string;
	};
	previousTrauma?: {
		present?: boolean;
		description?: string;
	};
	glasgow?: {
		eyes?: number;
		verbal?: number;
		motor?: number;
		total?: number;
	};
	strength?: {
		upperRight?: string;
		upperLeft?: string;
		lowerRight?: string;
		lowerLeft?: string;
	};
	sensitivity?: string;
	gait?: string;
	cranialNerves?: string;
}

interface NeuroFormProps {
	initialData?: Partial<NeuroFormData>;
	onChange: (data: NeuroFormData) => void;
}

export default function NeuroForm({ initialData, onChange }: NeuroFormProps) {
	const [formData, setFormData] = useState<NeuroFormData>(initialData || {});

	const updateFormData = (updates: Partial<NeuroFormData>) => {
		const newData = { ...formData, ...updates };
		setFormData(newData);
		onChange(newData);
	};

	const calculateGlasgow = (eyes?: number, verbal?: number, motor?: number) => {
		if (eyes !== undefined && verbal !== undefined && motor !== undefined) {
			return eyes + verbal + motor;
		}
		return undefined;
	};

	const handleGlasgowChange = (field: 'eyes' | 'verbal' | 'motor', value: string) => {
		const numValue = value === '' ? undefined : Number(value);
		const newGlasgow = {
			...formData.glasgow,
			[field]: numValue,
		};
		const total = calculateGlasgow(newGlasgow.eyes, newGlasgow.verbal, newGlasgow.motor);
		updateFormData({ glasgow: { ...newGlasgow, total } });
	};

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Brain size={20} />
					Formulario de Neurología
				</h2>
			</div>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Convulsiones</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.seizures?.present || false} onChange={(e) => updateFormData({ seizures: { ...formData.seizures, present: e.target.checked } })} className="rounded" />
						<span className="text-sm">Presentes</span>
					</label>
					{formData.seizures?.present && (
						<>
							<div>
								<Label htmlFor="seizureType">Tipo</Label>
								<Input id="seizureType" value={formData.seizures?.type || ''} onChange={(e) => updateFormData({ seizures: { ...formData.seizures, type: e.target.value } })} placeholder="Tónico-clónica, parcial, etc." />
							</div>
							<div>
								<Label htmlFor="seizureFrequency">Frecuencia</Label>
								<Input id="seizureFrequency" value={formData.seizures?.frequency || ''} onChange={(e) => updateFormData({ seizures: { ...formData.seizures, frequency: e.target.value } })} placeholder="Ej: 1 vez/mes" />
							</div>
							<div>
								<Label htmlFor="lastSeizure">Último Episodio</Label>
								<Input id="lastSeizure" type="date" value={formData.seizures?.lastEpisode || ''} onChange={(e) => updateFormData({ seizures: { ...formData.seizures, lastEpisode: e.target.value } })} />
							</div>
						</>
					)}
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Cefaleas</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.headaches?.present || false} onChange={(e) => updateFormData({ headaches: { ...formData.headaches, present: e.target.checked } })} className="rounded" />
						<span className="text-sm">Presentes</span>
					</label>
					{formData.headaches?.present && (
						<>
							<div>
								<Label htmlFor="headacheType">Tipo</Label>
								<Input id="headacheType" value={formData.headaches?.type || ''} onChange={(e) => updateFormData({ headaches: { ...formData.headaches, type: e.target.value } })} placeholder="Migraña, tensional, etc." />
							</div>
							<div>
								<Label htmlFor="headacheFrequency">Frecuencia</Label>
								<Input id="headacheFrequency" value={formData.headaches?.frequency || ''} onChange={(e) => updateFormData({ headaches: { ...formData.headaches, frequency: e.target.value } })} placeholder="Ej: 2-3 veces/semana" />
							</div>
							<div>
								<Label htmlFor="headacheChar">Características</Label>
								<Textarea id="headacheChar" value={formData.headaches?.characteristics || ''} onChange={(e) => updateFormData({ headaches: { ...formData.headaches, characteristics: e.target.value } })} placeholder="Localización, intensidad, síntomas asociados" rows={2} />
							</div>
						</>
					)}
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Trauma Previo</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.previousTrauma?.present || false} onChange={(e) => updateFormData({ previousTrauma: { ...formData.previousTrauma, present: e.target.checked } })} className="rounded" />
						<span className="text-sm">Presente</span>
					</label>
					{formData.previousTrauma?.present && (
						<div>
							<Label htmlFor="traumaDesc">Descripción</Label>
							<Textarea id="traumaDesc" value={formData.previousTrauma?.description || ''} onChange={(e) => updateFormData({ previousTrauma: { ...formData.previousTrauma, description: e.target.value } })} placeholder="Tipo de trauma, fecha, consecuencias" rows={2} />
						</div>
					)}
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Escala de Glasgow</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<Label htmlFor="glasgowEyes">Apertura Ocular (1-4)</Label>
						<Input id="glasgowEyes" type="number" min="1" max="4" value={formData.glasgow?.eyes || ''} onChange={(e) => handleGlasgowChange('eyes', e.target.value)} placeholder="1-4" />
					</div>
					<div>
						<Label htmlFor="glasgowVerbal">Respuesta Verbal (1-5)</Label>
						<Input id="glasgowVerbal" type="number" min="1" max="5" value={formData.glasgow?.verbal || ''} onChange={(e) => handleGlasgowChange('verbal', e.target.value)} placeholder="1-5" />
					</div>
					<div>
						<Label htmlFor="glasgowMotor">Respuesta Motora (1-6)</Label>
						<Input id="glasgowMotor" type="number" min="1" max="6" value={formData.glasgow?.motor || ''} onChange={(e) => handleGlasgowChange('motor', e.target.value)} placeholder="1-6" />
					</div>
					<div>
						<Label htmlFor="glasgowTotal">Total</Label>
						<Input id="glasgowTotal" type="number" value={formData.glasgow?.total || ''} readOnly className="bg-slate-50 font-semibold" placeholder="Calculado" />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Fuerza Muscular</h3>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="strengthUR">Miembro Superior Derecho</Label>
						<Input id="strengthUR" value={formData.strength?.upperRight || ''} onChange={(e) => updateFormData({ strength: { ...formData.strength, upperRight: e.target.value } })} placeholder="0-5" />
					</div>
					<div>
						<Label htmlFor="strengthUL">Miembro Superior Izquierdo</Label>
						<Input id="strengthUL" value={formData.strength?.upperLeft || ''} onChange={(e) => updateFormData({ strength: { ...formData.strength, upperLeft: e.target.value } })} placeholder="0-5" />
					</div>
					<div>
						<Label htmlFor="strengthLR">Miembro Inferior Derecho</Label>
						<Input id="strengthLR" value={formData.strength?.lowerRight || ''} onChange={(e) => updateFormData({ strength: { ...formData.strength, lowerRight: e.target.value } })} placeholder="0-5" />
					</div>
					<div>
						<Label htmlFor="strengthLL">Miembro Inferior Izquierdo</Label>
						<Input id="strengthLL" value={formData.strength?.lowerLeft || ''} onChange={(e) => updateFormData({ strength: { ...formData.strength, lowerLeft: e.target.value } })} placeholder="0-5" />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Sensibilidad</h3>
				<div>
					<Label htmlFor="sensitivity">Evaluación de Sensibilidad</Label>
					<Textarea id="sensitivity" value={formData.sensitivity || ''} onChange={(e) => updateFormData({ sensitivity: e.target.value })} placeholder="Tacto, dolor, temperatura, vibración" rows={2} />
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Marcha</h3>
				<div>
					<Label htmlFor="gait">Evaluación de la Marcha</Label>
					<Textarea id="gait" value={formData.gait || ''} onChange={(e) => updateFormData({ gait: e.target.value })} placeholder="Tipo de marcha, equilibrio, coordinación" rows={2} />
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Pares Craneales</h3>
				<div>
					<Label htmlFor="cranialNerves">Evaluación de Pares Craneales</Label>
					<Textarea id="cranialNerves" value={formData.cranialNerves || ''} onChange={(e) => updateFormData({ cranialNerves: e.target.value })} placeholder="I-XII, función, alteraciones" rows={3} />
				</div>
			</Card>
		</div>
	);
}

