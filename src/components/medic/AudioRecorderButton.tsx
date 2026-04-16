'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Check, X, AlertCircle, Sparkles, Brain, Zap, Activity } from 'lucide-react';

interface AudioRecorderButtonProps {
	consultationId: string;
	reportType: string;
	specialty: string;
	onSuccess?: (reportUrl: string, transcription?: string) => void;
	onError?: (error: string) => void;
	className?: string;
	customEndpoint?: string;
	onSuccessContent?: (content: string, transcription?: string) => void;
	onStart?: () => void;
}

export default function AudioRecorderButton({
	consultationId,
	reportType,
	specialty,
	onSuccess,
	onSuccessContent,
	onError,
	onStart,
	className = '',
	customEndpoint,
}: AudioRecorderButtonProps) {
	const [isRecording, setIsRecording] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
	const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
	const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
	const [recordingTime, setRecordingTime] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);
	const [progressMessage, setProgressMessage] = useState('Iniciando procesamiento...');
	
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
			if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
			}
		};
	}, []);

	const startRecording = async () => {
		try {
			setError(null);
			setSuccess(null);
			setRecordedAudio(null);
			setAudioChunks([]);
			setRecordingTime(0);

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const recorder = new MediaRecorder(stream, {
				mimeType: 'audio/webm;codecs=opus',
			});

			const chunks: Blob[] = [];
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunks.push(event.data);
				}
			};

			recorder.onstop = () => {
				const audioBlob = new Blob(chunks, { type: 'audio/webm' });
				setRecordedAudio(audioBlob);
				setAudioChunks([]);
			};

			recorder.start();
			setMediaRecorder(recorder);
			setIsRecording(true);
			
			if (onStart) onStart();

			timerRef.current = setInterval(() => {
				setRecordingTime((prev) => prev + 1);
			}, 1000);

		} catch (err: any) {
			console.error('Error al iniciar grabación:', err);
			setError('No se pudo acceder al micrófono. Por favor, permite el acceso.');
			if (onError) onError('Error al iniciar grabación');
		}
	};

	const stopRecording = () => {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			mediaRecorder.stream.getTracks().forEach((track) => track.stop());
			setIsRecording(false);
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const handleSubmit = async () => {
		if (!recordedAudio) {
			setError('No hay audio grabado');
			return;
		}

		setIsProcessing(true);
		setError(null);
		setSuccess(null);
		setProgress(0);
		setProgressMessage('Subiendo audio...');

		let currentProgress = 0;
		progressIntervalRef.current = setInterval(() => {
			currentProgress += Math.random() * 3;
			if (currentProgress >= 95) currentProgress = 95;
			setProgress(currentProgress);

			if (currentProgress < 20) setProgressMessage('Subiendo audio...');
			else if (currentProgress < 40) setProgressMessage('Transcribiendo audio...');
			else if (currentProgress < 60) setProgressMessage('Analizando semántica...');
			else if (currentProgress < 80) setProgressMessage('Generando informe clínico...');
			else setProgressMessage('Finalizando documento...');
		}, 800);

		try {
			const formData = new FormData();
			formData.append('audio', recordedAudio, `audio-${Date.now()}.webm`);
			formData.append('reportType', reportType);
			formData.append('specialty', specialty);

			const endpoint = customEndpoint || `/api/consultations/${consultationId}/generate-report-from-audio`;
			
			const response = await fetch(endpoint, {
				method: 'POST',
				body: formData,
			});

			const result = await response.json();

			if (!response.ok) throw new Error(result.error || 'Error al procesar el audio');

			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			
			setProgress(100);
			setProgressMessage('Procesamiento exitoso');
			setSuccess('Informe generado exitosamente');
			setRecordedAudio(null);

			if (result.content && onSuccessContent) {
				onSuccessContent(result.content, result.transcription);
				return;
			}

			const reportUrl = result.report_url || result.reportUrl;
			
			if (reportUrl) {
				if (onSuccess) onSuccess(reportUrl, result.transcription);
				setTimeout(() => {
					try {
						fetch(reportUrl)
							.then(response => response.blob())
							.then(blob => {
								const url = window.URL.createObjectURL(blob);
								const link = document.createElement('a');
								link.href = url;
								link.download = `informe-consulta-${consultationId}.docx`;
								link.style.display = 'none';
								document.body.appendChild(link);
								link.click();
								document.body.removeChild(link);
								setTimeout(() => window.URL.revokeObjectURL(url), 100);
							});
					} catch (error) {
						window.open(reportUrl, '_blank');
					}
				}, 1500);
			}

			setTimeout(() => setSuccess(null), 5000);

		} catch (err: any) {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			setError(err.message || 'Error al procesar el audio');
			setProgress(0);
			if (onError) onError(err.message);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleCancel = () => {
		setRecordedAudio(null);
		setError(null);
		setSuccess(null);
		if (mediaRecorder && isRecording) {
			stopRecording();
		}
	};

	return (
		<div className={`flex flex-col gap-3 ${className}`}>
			{/* Acción Principal: Motor de IA Syncwave - Versión Compacta */}
			{!recordedAudio && (
				<div className="flex flex-col gap-3">
					{!isRecording ? (
						<div className="group relative overflow-hidden rounded-3xl bg-slate-950 p-0.5 border border-slate-800 shadow-xl transition-all duration-500 hover:shadow-indigo-500/10">
							{/* Efecto de resplandor sutil en hover */}
							<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
							
							<div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/40 backdrop-blur-xl rounded-[1.4rem] p-3 sm:p-4">
								{/* Botón de Acción Principal */}
								<button
									type="button"
									onClick={startRecording}
									disabled={isProcessing}
									className="relative flex-1 flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 transition-all duration-300 group/btn active:scale-[0.98]"
								>
									<div className="relative flex items-center justify-center">
										<div className="absolute inset-0 bg-indigo-500 blur-md opacity-20 group-hover/btn:opacity-40 transition-opacity" />
										<div className="relative p-2.5 bg-indigo-600 rounded-lg text-white shadow-lg group-hover/btn:rotate-3 transition-transform">
											<Mic size={18} />
										</div>
									</div>
									
									<div className="flex flex-col items-start min-w-0 text-left">
										<span className="text-sm font-bold text-white tracking-tight leading-none mb-1">Generar Informe IA</span>
										<div className="flex items-center gap-1.5">
											<span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em] whitespace-nowrap">Captura Clínica</span>
											{/* Indicador de Estado Live */}
											<div className="flex items-center gap-1 px-1 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
												<div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
												<span className="text-[6px] font-black text-emerald-400 uppercase tracking-tighter">Live</span>
											</div>
										</div>
									</div>
								</button>

								{/* Info Badge & Versioning - Compact */}
								<div className="flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 px-1 sm:border-l sm:border-white/5 sm:pl-4">
									<div className="flex flex-col items-start sm:items-end">
										<span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none">Intelligence</span>
										<span className="text-xs font-black text-indigo-400 tracking-tighter whitespace-nowrap leading-none">v.2026 Engine</span>
									</div>
									
									<div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-lg border border-white/5">
										<div className="p-0.5 bg-indigo-500/20 rounded-md">
											<Zap size={8} className="text-indigo-400" />
										</div>
										<span className="text-[8px] font-black text-white/80 uppercase tracking-widest pr-0.5">Clinical Pro</span>
									</div>
								</div>
							</div>

							{/* Banner de Descripción Integrado - Micro-Compacto */}
							<div className="px-5 py-2.5 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent border-t border-white/[0.05]">
								<div className="flex items-center gap-3">
									<Brain size={12} className="text-indigo-400/60 flex-shrink-0" />
									<p className="text-[10px] text-slate-400 leading-tight">
										<span className="text-indigo-400/80 font-bold mr-1 uppercase text-[8px] tracking-tighter">IA 2026:</span> 
										Análisis semántico clínico y generación automática de informes médicos estructurados.
									</p>
								</div>
							</div>
						</div>
					) : (
						/* Recording State UI - Compact */
						<div className="relative overflow-hidden rounded-3xl bg-slate-950 p-4 border border-rose-500/30 shadow-xl animate-in fade-in zoom-in-95 duration-500">
							<div className="absolute top-0 right-0 p-4 opacity-5">
								<Activity size={80} className="text-rose-500 animate-pulse" />
							</div>
							
							<div className="relative flex flex-col items-center gap-4">
								<div className="flex items-center gap-4">
									<div className="relative">
										<div className="absolute inset-0 bg-rose-500 rounded-full blur-lg opacity-40 animate-ping" />
										<div className="relative p-3 bg-rose-600 rounded-full shadow-lg shadow-rose-600/40">
											<Square size={18} className="text-white fill-white" />
										</div>
									</div>
									<div className="flex flex-col">
										<span className="text-2xl font-black text-white tabular-nums tracking-tighter leading-none">{formatTime(recordingTime)}</span>
										<span className="text-[9px] font-bold text-rose-400 uppercase tracking-[0.2em] mt-1">Grabación Activa</span>
									</div>
								</div>

								<div className="w-full h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />

								<button
									type="button"
									onClick={stopRecording}
									className="group w-full flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl transition-all duration-300 font-bold text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-[0.98]"
								>
									Detener Captura de Audio
								</button>
							</div>
						</div>
					)}
				</div>
			)}


			{/* Audio grabado - Controles Profesionales Compactos */}
			{recordedAudio && !isProcessing && (
				<div className="flex flex-col gap-5 p-6 bg-white rounded-3xl border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-500">
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
								<Check size={20} strokeWidth={3} />
							</div>
							<div className="flex flex-col">
								<span className="text-sm font-bold text-slate-900 tracking-tight leading-none">Captura Finalizada</span>
								<div className="flex items-center gap-1.5 mt-1">
									<span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{Math.round(recordedAudio.size / 1024)} KB</span>
									<div className="w-1 h-1 rounded-full bg-slate-200" />
									<span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{formatTime(recordingTime)}</span>
								</div>
							</div>
						</div>
						
						<div className="w-full sm:w-auto p-0.5 bg-slate-50 border border-slate-100 rounded-xl">
							<audio
								src={URL.createObjectURL(recordedAudio)}
								controls
								className="h-8 w-full rounded-lg opacity-90"
							/>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row items-center gap-2">
						<button
							type="button"
							onClick={handleSubmit}
							disabled={isProcessing}
							className="group w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl transition-all duration-300 hover:bg-black shadow-lg shadow-slate-900/10 active:scale-[0.98]"
						>
							<Sparkles size={16} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
							<span className="text-xs font-bold uppercase tracking-[0.1em]">Procesar con IA 2026</span>
						</button>

						<button
							type="button"
							onClick={handleCancel}
							disabled={isProcessing}
							className="w-full sm:w-auto p-3.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 hover:text-slate-600 transition-all active:scale-[0.98]"
							title="Descartar grabación"
						>
							<X size={16} />
						</button>
					</div>
					
					<div className="flex items-center justify-center gap-2 pt-1">
						<Activity size={10} className="text-indigo-400 animate-pulse" />
						<p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em]">Sincronización Clínica Activa</p>
					</div>
				</div>
			)}

			{/* Mensajes de feedback */}
			{(error || success) && (
				<div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
					{error && (
						<div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700">
							<div className="p-1.5 bg-rose-100 rounded-lg">
								<AlertCircle size={18} />
							</div>
							<span className="text-xs font-bold uppercase tracking-wide">{error}</span>
						</div>
					)}

					{success && (
						<div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700">
							<div className="p-1.5 bg-emerald-100 rounded-lg">
								<Check size={18} />
							</div>
							<span className="text-xs font-bold uppercase tracking-wide">{success}</span>
						</div>
					)}
				</div>
			)}

			{/* Pantalla de carga - Diseño de Alto Nivel */}
			{isProcessing && (
				<div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-500">
					<div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-sm w-full mx-4 border border-white/20 flex flex-col items-center">
						<div className="relative mb-10">
							<div className="absolute inset-0 bg-indigo-500 rounded-full blur-[3rem] opacity-30 animate-pulse" />
							<div className="relative p-8 bg-slate-900 rounded-[2rem] shadow-2xl border border-white/10 group">
								<Brain size={56} className="text-white animate-pulse" />
								<div className="absolute -top-2 -right-2 p-2 bg-indigo-500 rounded-xl shadow-lg animate-bounce">
									<Zap size={16} className="text-white" />
								</div>
							</div>
						</div>
						
						<div className="w-full text-center space-y-3 mb-10">
							<h3 className="text-2xl font-black text-slate-900 tracking-tighter">Motor Syncwave IA</h3>
							<div className="flex flex-col gap-1">
								<p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">{progressMessage}</p>
								<p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Generación de Informe Clínico v.2026</p>
							</div>
						</div>

						{/* Barra de Progreso Sophisticada */}
						<div className="w-full space-y-4">
							<div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
								<div
									className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 to-cyan-500 transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(79,70,229,0.4)]"
									style={{ width: `${progress}%` }}
								/>
							</div>
							<div className="flex justify-between items-center px-1">
								<span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Progreso</span>
								<span className="text-sm font-black text-slate-900 tabular-nums">{Math.round(progress)}%</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
