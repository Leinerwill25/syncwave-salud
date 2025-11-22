'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Heart } from 'lucide-react';

export interface GineFormData {
	menarche?: number; // Edad de menarquia
	fur?: string; // Fecha de última regla
	cycles?: {
		regular?: boolean;
		duration?: number; // Duración del ciclo en días
		flow?: string; // Características del flujo
	};
	contraceptives?: {
		current?: string;
		history?: string;
	};
	obstetricHistory?: {
		gestas?: number;
		partos?: number;
		cesareas?: number;
		abortos?: number;
		details?: string;
	};
	gynecologicalExam?: {
		breast?: string;
		abdomen?: string;
		genital?: string;
		speculum?: string;
		bimanual?: string;
	};
}

interface GineFormProps {
	initialData?: Partial<GineFormData>;
	onChange: (data: GineFormData) => void;
}

export default function GineForm({ initialData, onChange }: GineFormProps) {
	const [formData, setFormData] = useState<GineFormData>(initialData || {});

	const updateFormData = (updates: Partial<GineFormData>) => {
		const newData = { ...formData, ...updates };
		setFormData(newData);
		onChange(newData);
	};

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-pink-600 to-rose-600 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Heart size={20} />
					Formulario de Ginecología
				</h2>
			</div>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Historia Menstrual</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="menarche">Menarquia (años)</Label>
						<Input id="menarche" type="number" value={formData.menarche || ''} onChange={(e) => updateFormData({ menarche: e.target.value ? Number(e.target.value) : undefined })} placeholder="Edad" />
					</div>
					<div>
						<Label htmlFor="fur">FUR (Fecha de Última Regla)</Label>
						<Input id="fur" type="date" value={formData.fur || ''} onChange={(e) => updateFormData({ fur: e.target.value })} />
					</div>
					<div>
						<Label htmlFor="cycleRegular">Ciclos Regulares</Label>
						<select id="cycleRegular" value={formData.cycles?.regular === undefined ? '' : formData.cycles.regular ? 'true' : 'false'} onChange={(e) => updateFormData({ cycles: { ...formData.cycles, regular: e.target.value === 'true' } })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
							<option value="">Seleccionar</option>
							<option value="true">Sí</option>
							<option value="false">No</option>
						</select>
					</div>
					<div>
						<Label htmlFor="cycleDuration">Duración del Ciclo (días)</Label>
						<Input id="cycleDuration" type="number" value={formData.cycles?.duration || ''} onChange={(e) => updateFormData({ cycles: { ...formData.cycles, duration: e.target.value ? Number(e.target.value) : undefined } })} placeholder="Días" />
					</div>
					<div>
						<Label htmlFor="cycleFlow">Características del Flujo</Label>
						<Input id="cycleFlow" value={formData.cycles?.flow || ''} onChange={(e) => updateFormData({ cycles: { ...formData.cycles, flow: e.target.value } })} placeholder="Normal, abundante, escaso" />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Anticonceptivos</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="currentContraceptive">Anticonceptivo Actual</Label>
						<Input id="currentContraceptive" value={formData.contraceptives?.current || ''} onChange={(e) => updateFormData({ contraceptives: { ...formData.contraceptives, current: e.target.value } })} placeholder="Tipo y método" />
					</div>
					<div>
						<Label htmlFor="contraceptiveHistory">Historial de Anticonceptivos</Label>
						<Textarea id="contraceptiveHistory" value={formData.contraceptives?.history || ''} onChange={(e) => updateFormData({ contraceptives: { ...formData.contraceptives, history: e.target.value } })} placeholder="Anticonceptivos previos y duración" rows={2} />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Historial Obstétrico</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<Label htmlFor="gestas">Gestas (G)</Label>
						<Input id="gestas" type="number" value={formData.obstetricHistory?.gestas || ''} onChange={(e) => updateFormData({ obstetricHistory: { ...formData.obstetricHistory, gestas: e.target.value ? Number(e.target.value) : undefined } })} placeholder="G" />
					</div>
					<div>
						<Label htmlFor="partos">Partos (P)</Label>
						<Input id="partos" type="number" value={formData.obstetricHistory?.partos || ''} onChange={(e) => updateFormData({ obstetricHistory: { ...formData.obstetricHistory, partos: e.target.value ? Number(e.target.value) : undefined } })} placeholder="P" />
					</div>
					<div>
						<Label htmlFor="cesareas">Cesáreas (C)</Label>
						<Input id="cesareas" type="number" value={formData.obstetricHistory?.cesareas || ''} onChange={(e) => updateFormData({ obstetricHistory: { ...formData.obstetricHistory, cesareas: e.target.value ? Number(e.target.value) : undefined } })} placeholder="C" />
					</div>
					<div>
						<Label htmlFor="abortos">Abortos (A)</Label>
						<Input id="abortos" type="number" value={formData.obstetricHistory?.abortos || ''} onChange={(e) => updateFormData({ obstetricHistory: { ...formData.obstetricHistory, abortos: e.target.value ? Number(e.target.value) : undefined } })} placeholder="A" />
					</div>
				</div>
				<div className="mt-4">
					<Label htmlFor="obstetricDetails">Detalles Adicionales</Label>
					<Textarea id="obstetricDetails" value={formData.obstetricHistory?.details || ''} onChange={(e) => updateFormData({ obstetricHistory: { ...formData.obstetricHistory, details: e.target.value } })} placeholder="Complicaciones, detalles de embarazos" rows={2} />
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Examen Ginecológico</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="examBreast">Examen de Mamas</Label>
						<Textarea id="examBreast" value={formData.gynecologicalExam?.breast || ''} onChange={(e) => updateFormData({ gynecologicalExam: { ...formData.gynecologicalExam, breast: e.target.value } })} placeholder="Inspección, palpación" rows={2} />
					</div>
					<div>
						<Label htmlFor="examAbdomen">Abdomen</Label>
						<Textarea id="examAbdomen" value={formData.gynecologicalExam?.abdomen || ''} onChange={(e) => updateFormData({ gynecologicalExam: { ...formData.gynecologicalExam, abdomen: e.target.value } })} placeholder="Inspección, palpación" rows={2} />
					</div>
					<div>
						<Label htmlFor="examGenital">Genitales Externos</Label>
						<Textarea id="examGenital" value={formData.gynecologicalExam?.genital || ''} onChange={(e) => updateFormData({ gynecologicalExam: { ...formData.gynecologicalExam, genital: e.target.value } })} placeholder="Inspección" rows={2} />
					</div>
					<div>
						<Label htmlFor="examSpeculum">Especuloscopia</Label>
						<Textarea id="examSpeculum" value={formData.gynecologicalExam?.speculum || ''} onChange={(e) => updateFormData({ gynecologicalExam: { ...formData.gynecologicalExam, speculum: e.target.value } })} placeholder="Cuello uterino, flujo" rows={2} />
					</div>
					<div>
						<Label htmlFor="examBimanual">Tacto Bimanual</Label>
						<Textarea id="examBimanual" value={formData.gynecologicalExam?.bimanual || ''} onChange={(e) => updateFormData({ gynecologicalExam: { ...formData.gynecologicalExam, bimanual: e.target.value } })} placeholder="Útero, anexos" rows={2} />
					</div>
				</div>
			</Card>
		</div>
	);
}

