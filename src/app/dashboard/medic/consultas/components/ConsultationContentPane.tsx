'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface ConsultationContentPaneProps {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
	onNext?: () => void;
	onBack?: () => void;
	nextLabel?: string;
	backLabel?: string;
	hideNext?: boolean;
	hideBack?: boolean;
	fullWidth?: boolean;
}

export default function ConsultationContentPane({
	title,
	subtitle,
	children,
	onNext,
	onBack,
	nextLabel = "Siguiente",
	backLabel = "Anterior",
	hideNext = false,
	hideBack = false,
	fullWidth = false
}: ConsultationContentPaneProps) {
	return (
		<div className="flex-1 flex flex-col min-h-[calc(100vh-200px)] bg-slate-50 relative">
			{/* Content Header */}
			<header className="px-8 py-5 bg-white border-b border-slate-200 flex flex-col gap-1 shadow-sm sticky top-0 z-10 w-full">
				<h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
					<div className="w-1.5 h-6 bg-teal-500 rounded-full" />
					{title}
				</h1>
				{subtitle && <p className="text-xs font-medium text-slate-500 uppercase tracking-widest pl-3.5">{subtitle}</p>}
			</header>

			{/* Scrollable Content Area */}
			<main className="flex-1 p-4 md:p-8 pb-12">
				<div className={`${fullWidth ? 'max-w-full' : 'max-w-4xl'} mx-auto animate-in fade-in duration-300`}>
					
					{/* Main Card Wrapper */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-8 flex flex-col min-h-[400px]">
						
						{/* Dynamic Content */}
						<div className="flex-1 w-full space-y-6">
							{children}
						</div>

						{/* Integrated Navigation Buttons */}
						<div className="flex items-center justify-between pt-8 mt-12 border-t border-slate-100">
							<div>
								{!hideBack && onBack && (
									<button
										onClick={onBack}
										className="group flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
									>
										<ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
										{backLabel}
									</button>
								)}
							</div>
							
							<div>
								{!hideNext && onNext && (
									<button
										onClick={onNext}
										className="group flex items-center gap-2 px-7 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 shadow-md hover:shadow-teal-100 transition-all duration-200"
									>
										{nextLabel}
										<ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
									</button>
								)}
							</div>
						</div>
					</div>

				</div>
			</main>
		</div>
	);
}
