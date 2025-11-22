'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calculator, AlertCircle } from 'lucide-react';

interface PediatricDosingCalculatorProps {
	patientWeight?: number; // in kg
	patientAge?: number; // in years
	onDoseCalculated?: (dose: string) => void;
}

export default function PediatricDosingCalculator({ patientWeight, patientAge, onDoseCalculated }: PediatricDosingCalculatorProps) {
	const [weight, setWeight] = useState<number | ''>(patientWeight || '');
	const [dosePerKg, setDosePerKg] = useState<number | ''>('');
	const [calculatedDose, setCalculatedDose] = useState<string>('');

	useEffect(() => {
		if (patientWeight) {
			setWeight(patientWeight);
		}
	}, [patientWeight]);

	useEffect(() => {
		if (weight && dosePerKg) {
			const w = Number(weight);
			const d = Number(dosePerKg);
			if (w > 0 && d > 0) {
				const totalDose = (w * d).toFixed(2);
				setCalculatedDose(`${totalDose} mg`);
				if (onDoseCalculated) {
					onDoseCalculated(`${totalDose} mg`);
				}
			} else {
				setCalculatedDose('');
			}
		} else {
			setCalculatedDose('');
		}
	}, [weight, dosePerKg, onDoseCalculated]);

	const commonDoses = [
		{ label: 'Amoxicilina', dose: 50 },
		{ label: 'Paracetamol', dose: 15 },
		{ label: 'Ibuprofeno', dose: 10 },
		{ label: 'Azitromicina', dose: 10 },
		{ label: 'Cefalexina', dose: 25 },
	];

	return (
		<Card className="p-4 bg-blue-50 border-blue-200">
			<div className="flex items-center gap-2 mb-3">
				<Calculator size={18} className="text-blue-600" />
				<Label className="text-sm font-semibold text-slate-900">Calculadora de Dosis Pediátrica</Label>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
				<div>
					<Label htmlFor="pedWeight" className="text-xs">Peso del Paciente (kg)</Label>
					<Input
						id="pedWeight"
						type="number"
						step="0.1"
						value={weight}
						onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
						placeholder="kg"
						className="mt-1"
					/>
				</div>
				<div>
					<Label htmlFor="dosePerKg" className="text-xs">Dosis (mg/kg)</Label>
					<Input
						id="dosePerKg"
						type="number"
						step="0.1"
						value={dosePerKg}
						onChange={(e) => setDosePerKg(e.target.value ? Number(e.target.value) : '')}
						placeholder="mg/kg"
						className="mt-1"
					/>
				</div>
				<div>
					<Label className="text-xs">Dosis Total Calculada</Label>
					<div className="mt-1 px-3 py-2 bg-white border border-blue-200 rounded-md text-sm font-semibold text-blue-700">
						{calculatedDose || '—'}
					</div>
				</div>
			</div>

			{patientAge !== undefined && patientAge < 18 && (
				<div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
					<AlertCircle size={16} className="text-amber-600 mt-0.5" />
					<div className="text-xs text-amber-800">
						<strong>Paciente pediátrico:</strong> Verifique siempre la dosis según el peso y la edad. Consulte las guías farmacológicas pediátricas.
					</div>
				</div>
			)}

			<div className="mt-3">
				<Label className="text-xs mb-2 block">Dosis Comunes (mg/kg/día)</Label>
				<div className="flex flex-wrap gap-2">
					{commonDoses.map((item) => (
						<button
							key={item.label}
							type="button"
							onClick={() => setDosePerKg(item.dose)}
							className="px-3 py-1 text-xs bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition"
						>
							{item.label}: {item.dose} mg/kg
						</button>
					))}
				</div>
			</div>
		</Card>
	);
}

