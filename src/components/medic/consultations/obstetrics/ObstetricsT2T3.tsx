'use client';

import React from 'react';
import { 
	FileText, 
	Calendar, 
	Activity, 
	Info,
	Heart,
	Layers,
	Baby,
	Droplets,
	CheckSquare
} from 'lucide-react';

interface ObstetricsT2T3Props {
	data: any;
	onChange: (newData: any) => void;
}

const SectionHeader = ({ icon: Icon, title, color = "indigo" }: { icon: any, title: string, color?: string }) => (
	<div className={`flex items-center gap-3 mb-6 pb-4 border-b border-${color}-100`}>
		<div className={`w-10 h-10 rounded-xl bg-${color}-50 flex items-center justify-center text-${color}-600 shadow-sm`}>
			<Icon size={20} />
		</div>
		<h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
	</div>
);

const FieldLabel = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
	<label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
		{children} {required && <span className="text-rose-500">*</span>}
	</label>
);

const Input = ({ ...props }) => (
	<input 
		{...props}
		className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-200"
	/>
);

const Select = ({ children, ...props }: any) => (
	<select 
		{...props}
		className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-200 appearance-none pointer-events-auto"
	>
		{children}
	</select>
);

export default function ObstetricsT2T3({ data, onChange }: ObstetricsT2T3Props) {
	const handleChange = (field: string, value: any) => {
		onChange({ ...data, [field]: value });
	};

	const handleConclusionsChange = (value: string) => {
		if (value.length > (data.conclusiones || '').length && value.endsWith('\n')) {
			const lines = value.split('\n');
			const lastLine = lines[lines.length - 2] || '';
			const lastLineMatch = lastLine.match(/^(\d+)\.\s*(.*)$/);
			if (lastLineMatch || lastLine.trim() === '') {
				const nextNumber = lastLineMatch ? parseInt(lastLineMatch[1]) + 1 : 1;
				const newValue = value.slice(0, -1) + `\n${nextNumber}. `;
				handleChange('conclusiones', newValue);
				return;
			}
		}
		handleChange('conclusiones', value);
	};

	return (
		<div className="space-y-8 animate-in fade-in duration-500 pb-20">
			{/* Banner Informativo */}
			<div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between overflow-hidden relative">
				<div className="relative z-10">
					<h2 className="text-2xl font-black mb-1">Segundo y Tercer Trimestre</h2>
					<p className="text-indigo-100 text-sm font-medium opacity-90">Crecimiento fetal, biometría y morfología detallada</p>
				</div>
				<Baby className="absolute right-[-20px] top-[-20px] w-40 h-40 text-white/10 rotate-12" />
				<div className="relative z-10 bg-white/20 backdrop-blur-md rounded-xl px-4 py-2 border border-white/30 text-xs font-bold">
					v.2026 CLINIC SYNCWAVE
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				
				{/* Columna Izquierda: Datos Base y Biometría */}
				<div className="lg:col-span-8 space-y-6">
					
					{/* Card: Datos de la Paciente */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
						<SectionHeader icon={Calendar} title="Control de Gestación" />
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<FieldLabel>Edad Gestacional</FieldLabel>
								<Input 
									value={data.edad_gestacional || ''} 
									onChange={(e: any) => handleChange('edad_gestacional', e.target.value)}
									placeholder="e.g. 24 sem + 2 d"
								/>
							</div>
							<div>
								<FieldLabel>FUR (Fecha Última Regla)</FieldLabel>
								<Input 
									type="date"
									value={data.fur || ''} 
									onChange={(e: any) => handleChange('fur', e.target.value)}
								/>
							</div>
							<div>
								<FieldLabel>FPP (Fecha Probable Parto)</FieldLabel>
								<Input 
									type="date"
									value={data.fpp || ''} 
									onChange={(e: any) => handleChange('fpp', e.target.value)}
								/>
							</div>
						</div>
					</div>

					{/* Card: Biometría Fetal */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
						<SectionHeader icon={Activity} title="Biometría Fetal (mm)" color="blue" />
						<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
							<div>
								<FieldLabel>DBP</FieldLabel>
								<Input type="number" value={data.dbp || ''} onChange={(e: any) => handleChange('dbp', e.target.value)} placeholder="0.0" />
							</div>
							<div>
								<FieldLabel>CC</FieldLabel>
								<Input type="number" value={data.cc || ''} onChange={(e: any) => handleChange('cc', e.target.value)} placeholder="0.0" />
							</div>
							<div>
								<FieldLabel>CA</FieldLabel>
								<Input type="number" value={data.ca || ''} onChange={(e: any) => handleChange('ca', e.target.value)} placeholder="0.0" />
							</div>
							<div>
								<FieldLabel>LF</FieldLabel>
								<Input type="number" value={data.lf || ''} onChange={(e: any) => handleChange('lf', e.target.value)} placeholder="0.0" />
							</div>
							<div className="md:col-span-2">
								<FieldLabel>Peso Estimado Fetal (g)</FieldLabel>
								<Input type="number" value={data.peso_estimado_fetal || ''} onChange={(e: any) => handleChange('peso_estimado_fetal', e.target.value)} placeholder="0" />
							</div>
							<div className="md:col-span-2">
								<FieldLabel>Percentil / Acorde a</FieldLabel>
								<Input value={data.para || ''} onChange={(e: any) => handleChange('para', e.target.value)} placeholder="PC 50" />
							</div>
						</div>
					</div>

					{/* Card: Anatomía Fetal Detallada */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
						<SectionHeader icon={CheckSquare} title="Evaluación Anatómica" color="slate" />
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<FieldLabel>Cráneo</FieldLabel>
								<Input value={data.craneo || ''} onChange={(e: any) => handleChange('craneo', e.target.value)} placeholder="Normal" />
							</div>
							<div>
								<FieldLabel>Corazón (IVC)</FieldLabel>
								<Input value={data.corazon || ''} onChange={(e: any) => handleChange('corazon', e.target.value)} placeholder="Normal" />
							</div>
							<div>
								<FieldLabel>FCF (lpm)</FieldLabel>
								<Input type="number" value={data.fcf || ''} onChange={(e: any) => handleChange('fcf', e.target.value)} placeholder="140" />
							</div>
							<div>
								<FieldLabel>Pulmones</FieldLabel>
								<Input value={data.pulmones || ''} onChange={(e: any) => handleChange('pulmones', e.target.value)} placeholder="Normal" />
							</div>
							<div>
								<FieldLabel>Estómago</FieldLabel>
								<Input value={data.estomago || ''} onChange={(e: any) => handleChange('estomago', e.target.value)} placeholder="Visible" />
							</div>
							<div>
								<FieldLabel>Vejiga</FieldLabel>
								<Input value={data.vejiga || ''} onChange={(e: any) => handleChange('vejiga', e.target.value)} placeholder="Visible" />
							</div>
							<div>
								<FieldLabel>Riñones</FieldLabel>
								<Input value={data.rinones || ''} onChange={(e: any) => handleChange('rinones', e.target.value)} placeholder="Simétricos" />
							</div>
							<div className="md:col-span-2">
								<FieldLabel>Miembros Superiores/Inferiores</FieldLabel>
								<Input value={data.miembros_superiores || ''} onChange={(e: any) => handleChange('miembros_superiores', e.target.value)} placeholder="Visibles completos" />
							</div>
						</div>
					</div>
				</div>

				{/* Columna Derecha: Placenta, ILA y Conclusiones */}
				<div className="lg:col-span-4 space-y-6">
					
					{/* Card: Placenta e ILA */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-l-indigo-600">
						<SectionHeader icon={Droplets} title="Anexos Fetales" color="blue" />
						<div className="space-y-6">
							<div>
								<FieldLabel>Situación Fetal</FieldLabel>
								<Input value={data.situacion || ''} onChange={(e: any) => handleChange('situacion', e.target.value)} placeholder="Longitudinal" />
							</div>
							<div>
								<FieldLabel>Placenta (Grado)</FieldLabel>
								<Select value={data.grado || ''} onChange={(e: any) => handleChange('grado', e.target.value)}>
									<option value="I/III">Grado I/III</option>
									<option value="II/III">Grado II/III</option>
									<option value="III/III">Grado III/III</option>
									<option value="0">Grado 0</option>
								</Select>
							</div>
							<div>
								<FieldLabel>Ubicación Placenta</FieldLabel>
								<Input value={data.ubi || ''} onChange={(e: any) => handleChange('ubi', e.target.value)} placeholder="Fúndica Anterior" />
							</div>
							<div>
								<FieldLabel>Líquido Amniótico (ILA)</FieldLabel>
								<Input value={data.ila || ''} onChange={(e: any) => handleChange('ila', e.target.value)} placeholder="12.0 cm" />
							</div>
						</div>
					</div>

					{/* Card: Conclusiones */}
					<div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
						<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
							<FileText size={80} />
						</div>
						<h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
							<Info size={20} className="text-indigo-400" />
							Conclusiones
						</h3>
						<textarea 
							value={data.conclusiones || ''} 
							onChange={(e) => handleConclusionsChange(e.target.value)}
							rows={12}
							className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-indigo-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
							placeholder="1. Informe anatómico normal..."
						/>
						<div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
							<Heart size={10} className="text-rose-500 animate-pulse" />
							Presiona ENTER para nueva línea
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
