'use client';

import React from 'react';
import { 
	User, 
	Activity, 
	Stethoscope, 
	ClipboardList, 
	FileText, 
	FileCheck, 
	Lock,
	CheckCircle2,
	ChevronRight
} from 'lucide-react';

export type NavItemStatus = 'done' | 'active' | 'pending' | 'locked';

interface NavNode {
	id: string;
	label: string;
	status: NavItemStatus;
	icon?: any;
	children?: NavNode[];
}

interface SidebarProps {
	patient: {
		firstName?: string;
		lastName?: string;
		identifier?: string;
	};
	currentSection: string;
	completedSections: Set<string>;
	onNavigate: (section: string) => void;
	onSave: () => void;
	loading: boolean;
	progressPercent: number;
	navTree: NavNode[];
}

export default function ConsultationSidebar({ 
	patient, 
	currentSection, 
	onNavigate, 
	onSave, 
	loading, 
	progressPercent,
	navTree
}: SidebarProps) {
	
	const renderNavItem = (node: NavNode, isChild = false) => {
		const isActive = currentSection === node.id;
		const Icon = node.icon;
		
		let statusClasses = "";
		switch (node.status) {
			case 'done':
				statusClasses = "text-teal-600 font-medium";
				break;
			case 'active':
				statusClasses = "text-teal-700 bg-teal-50 border-l-4 border-teal-500 font-bold shadow-sm";
				break;
			case 'pending':
				statusClasses = "text-slate-500 font-normal";
				break;
			case 'locked':
				statusClasses = "text-slate-300 cursor-not-allowed grayscale opacity-60";
				break;
		}

		return (
			<div key={node.id} className="w-full">
				<div 
					onClick={() => node.status !== 'locked' && onNavigate(node.id)}
					className={`flex items-center justify-between px-4 py-2.5 transition-all duration-200 group cursor-pointer ${
						isChild ? 'pl-10 text-xs' : 'text-sm'
					} ${isActive ? 'bg-teal-50' : 'hover:bg-slate-50'} ${statusClasses}`}
				>
					<div className="flex items-center gap-3 overflow-hidden">
						{!isChild && Icon && <Icon size={isActive ? 18 : 16} className={isActive ? "text-teal-600" : "text-slate-400"} />}
						{isChild && (
							<div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-teal-500 ring-2 ring-teal-200' : 'bg-slate-300'}`} />
						)}
						<span className="truncate">{node.label}</span>
					</div>
					
					<div className="flex items-center">
						{node.status === 'done' && <CheckCircle2 size={14} className="text-teal-500" />}
						{isActive && <ChevronRight size={14} className="text-teal-400 ml-1" />}
						{node.status === 'locked' && <Lock size={12} className="text-slate-300" />}
					</div>
				</div>
				
				{node.children && node.children.length > 0 && (
					<div className="mt-0.5 border-l border-slate-100 ml-6">
						{node.children.map(child => renderNavItem(child, true))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="w-[240px] min-w-[240px] bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shadow-sm z-20">
			{/* Patient Header */}
			<div className="p-5 border-b border-slate-100 shrink-0">
				<div className="flex items-center gap-3 mb-3">
					<div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200">
						{patient.firstName?.[0]}{patient.lastName?.[0]}
					</div>
					<div className="overflow-hidden">
						<h3 className="text-sm font-bold text-slate-800 truncate">
							{patient.firstName} {patient.lastName}
						</h3>
						<p className="text-[10px] text-slate-400 uppercase tracking-tighter">
							ID: {patient.identifier || 'No registrado'}
						</p>
					</div>
				</div>
			</div>

			{/* Navigation Scroll Area */}
			<div className="flex-1 overflow-y-auto pt-2 pb-20 scrollbar-hide min-h-0">
				<div className="px-3 mb-2">
					<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">Consulta Médica</p>
				</div>
				{navTree.map(node => renderNavItem(node))}
			</div>

			{/* Bottom Action Area */}
			<div className="p-4 bg-slate-50 border-t border-slate-200 w-full space-y-4 shrink-0 shadow-inner">
				<div className="space-y-1.5">
					<div className="flex justify-between text-[10px] font-bold text-slate-500">
						<span>PROGRESO</span>
						<span>{progressPercent}%</span>
					</div>
					<div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
						<div 
							className="h-full bg-teal-500 transition-all duration-500 ease-out shadow-sm"
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
				</div>
				
				<button
					onClick={onSave}
					disabled={loading}
					className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none translate-y-0 active:translate-y-0.5"
				>
					{loading ? (
						<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
					) : (
						<SaveIcon size={16} />
					)}
					<span>GUARDAR CAMBIOS</span>
				</button>
			</div>
		</div>
	);
}

function SaveIcon({ size }: { size: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
			<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
			<polyline points="17 21 17 13 7 13 7 21"></polyline>
			<polyline points="7 3 7 8 15 8"></polyline>
		</svg>
	);
}
