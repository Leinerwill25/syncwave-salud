'use client';

import React from 'react';
import { 
	FileText, 
	Calendar, 
	Activity, 
	ChevronRight,
	Info,
	Heart,
	Layers,
	Eye
} from 'lucide-react';

interface ObstetricsT1Props {
	data: any;
	onChange: (newData: any) => void;
}

const SectionHeader = ({ icon: Icon, title, color = "pink" }: { icon: any, title: string, color?: string }) => (
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
		className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all hover:border-pink-200"
	/>
);

const Select = ({ children, ...props }: any) => (
	<select 
		{...props}
		className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all hover:border-pink-200 appearance-none pointer-events-auto"
	>
		{children}
	</select>
);

export default function ObstetricsT1({ data, onChange }: ObstetricsT1Props) {
	const handleChange = (field: string, value: any) => {
		onChange({ ...data, [field]: value });
	};

	const handleConclusionsChange = (value: string) => {
		// New logic for auto-numbering
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
			<div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between overflow-hidden relative">
				<div className="relative z-10">
					<h2 className="text-2xl font-black mb-1">Primer Trimestre</h2>
					<p className="text-pink-100 text-sm font-medium opacity-90">Evaluación anatómica y gestacional temprana</p>
				</div>
				<Layers className="absolute right-[-20px] top-[-20px] w-40 h-40 text-white/10 rotate-12" />
				<div className="relative z-10 bg-white/20 backdrop-blur-md rounded-xl px-4 py-2 border border-white/30 text-xs font-bold">
					v.2026 CLINIC SYNCWAVE
				</div>
			</div>

			{/* Grid Principal */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				
				{/* Columna Izquierda: Datos Base */}
				<div className="lg:col-span-8 space-y-6">
					
					{/* Card: Datos de la Paciente */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
						<SectionHeader icon={Calendar} title="Cronología Gestacional" />
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<FieldLabel>Edad Gestacional</FieldLabel>
								<Input 
									value={data.edad_gestacional || ''} 
									onChange={(e: any) => handleChange('edad_gestacional', e.target.value)}
									placeholder="e.g. 10 sem + 4 d"
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

						<div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-100">
							<div>
								<FieldLabel>Gestas</FieldLabel>
								<Input type="number" value={data.gestas || ''} onChange={(e: any) => handleChange('gestas', e.target.value)} />
							</div>
							<div>
								<FieldLabel>Paras</FieldLabel>
								<Input type="number" value={data.paras || ''} onChange={(e: any) => handleChange('paras', e.target.value)} />
							</div>
							<div>
								<FieldLabel>Cesáreas</FieldLabel>
								<Input type="number" value={data.cesareas || ''} onChange={(e: any) => handleChange('cesareas', e.target.value)} />
							</div>
							<div>
								<FieldLabel>Abortos</FieldLabel>
								<Input type="number" value={data.abortors || ''} onChange={(e: any) => handleChange('abortors', e.target.value)} />
							</div>
						</div>
					</div>

					{/* Card: Hallazgos Ecopatrón */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
						<SectionHeader icon={Activity} title="Evaluación del Ecopatrón" />
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="md:col-span-2">
								<FieldLabel>Endometrio</FieldLabel>
								<Input value={data.endometrio || ''} onChange={(e: any) => handleChange('endometrio', e.target.value)} placeholder="Ocupado Por Saco Gestacional." />
							</div>
							<div>
								<FieldLabel>Miometrio</FieldLabel>
								<Input value={data.miometrio || ''} onChange={(e: any) => handleChange('miometrio', e.target.value)} placeholder="HOMOGENEO" />
							</div>
							<div>
								<FieldLabel>Fondo de Saco</FieldLabel>
								<Input value={data.fondo_de_saco || ''} onChange={(e: any) => handleChange('fondo_de_saco', e.target.value)} placeholder="Libre" />
							</div>
							<div>
								<FieldLabel>Ovario Derecho</FieldLabel>
								<Input value={data.ovario_derecho || ''} onChange={(e: any) => handleChange('ovario_derecho', e.target.value)} placeholder="Normal" />
							</div>
							<div>
								<FieldLabel>Ovario Izquierdo</FieldLabel>
								<Input value={data.ovario_izquierdo || ''} onChange={(e: any) => handleChange('ovario_izquierdo', e.target.value)} placeholder="Normal" />
							</div>
						</div>
					</div>

					{/* Card: Embrión */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
						<SectionHeader icon={Eye} title="Hallazgos Embrionarios" color="rose" />
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<FieldLabel>Embrión Visto</FieldLabel>
								<Select value={data.embrion_visto || ''} onChange={(e: any) => handleChange('embrion_visto', e.target.value)}>
									<option value="">Seleccionar...</option>
									<option value="Si">Si</option>
									<option value="No">No</option>
								</Select>
							</div>
							<div>
								<FieldLabel>LCR (mm)</FieldLabel>
								<Input value={data.lcr || ''} onChange={(e: any) => handleChange('lcr', e.target.value)} placeholder="Longitud Coronilla-Rabadilla" />
							</div>
							<div>
								<FieldLabel>Acorde A</FieldLabel>
								<Input value={data.acorde_a || ''} onChange={(e: any) => handleChange('acorde_a', e.target.value)} placeholder="Semanas" />
							</div>
							<div>
								<FieldLabel>Actividad Cardiaca</FieldLabel>
								<Select value={data.actividad_cardiaca || ''} onChange={(e: any) => handleChange('actividad_cardiaca', e.target.value)}>
									<option value="">Seleccionar...</option>
									<option value="Presente">Presente</option>
									<option value="Ausente">Ausente</option>
								</Select>
							</div>
							<div className="md:col-span-2">
								<FieldLabel>Movimientos Embrionarios</FieldLabel>
								<Select value={data.movimientos_embrionarios || ''} onChange={(e: any) => handleChange('movimientos_embrionarios', e.target.value)}>
									<option value="">Seleccionar...</option>
									<option value="Normal">Anatómicos y vigorosos</option>
									<option value="Lentos">Lentos</option>
									<option value="Ausentes">Ausentes</option>
								</Select>
							</div>
						</div>
					</div>
				</div>

				{/* Columna Derecha: Saco y Conclusiones */}
				<div className="lg:col-span-4 space-y-6">
					
					{/* Card: Saco Gestacional */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-l-pink-500">
						<SectionHeader icon={Layers} title="Unidad de Gestación" />
						<div className="space-y-6">
							<div>
								<FieldLabel>Gestación</FieldLabel>
								<Select value={data.gestacion || ''} onChange={(e: any) => handleChange('gestacion', e.target.value)}>
									<option value="">Seleccionar...</option>
									<option value="Única">Única</option>
									<option value="Múltiple">Múltiple</option>
								</Select>
							</div>
							<div>
								<FieldLabel>Localización</FieldLabel>
								<Select value={data.localizacion || ''} onChange={(e: any) => handleChange('localizacion', e.target.value)}>
									<option value="">Seleccionar...</option>
									<option value="Intrauterina">Intrauterina</option>
									<option value="Extrauterina">Extrauterina</option>
								</Select>
							</div>
							<div>
								<FieldLabel>Vesícula Vitilina</FieldLabel>
								<Select value={data.vesicula || ''} onChange={(e: any) => handleChange('vesicula', e.target.value)}>
									<option value="">Seleccionar...</option>
									<option value="Visible">Visible</option>
									<option value="No Visible">No Visible</option>
								</Select>
							</div>
						</div>
					</div>

					{/* Card: Conclusiones */}
					<div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
						<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
							<FileText size={80} />
						</div>
						<h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
							<Info size={20} className="text-pink-400" />
							Conclusiones
						</h3>
						<textarea 
							value={data.conclusiones || ''} 
							onChange={(e) => handleConclusionsChange(e.target.value)}
							rows={10}
							className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-pink-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-mono"
							placeholder="1. Iniciar con numeración automática..."
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
