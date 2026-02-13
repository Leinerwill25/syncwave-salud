'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Check, X, AlertCircle, Sparkles, Brain, Zap } from 'lucide-react';

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
			// Limpiar al desmontar
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
			}
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
			
			if (onStart) {
				onStart();
			}

			// Iniciar temporizador
			timerRef.current = setInterval(() => {
				setRecordingTime((prev) => prev + 1);
			}, 1000);

		} catch (err: any) {
			console.error('Error al iniciar grabación:', err);
			setError('No se pudo acceder al micrófono. Por favor, permite el acceso al micrófono.');
			if (onError) {
				onError('Error al iniciar grabación');
			}
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

		// Simular progreso (aunque sea aproximado)
		let currentProgress = 0;
		progressIntervalRef.current = setInterval(() => {
			currentProgress += Math.random() * 3; // Incremento aleatorio entre 0-3%
			if (currentProgress >= 95) {
				currentProgress = 95; // No llegar a 100% hasta que termine
			}
			setProgress(currentProgress);

			// Cambiar mensaje según el progreso
			if (currentProgress < 20) {
				setProgressMessage('Subiendo audio...');
			} else if (currentProgress < 40) {
				setProgressMessage('Transcribiendo audio...');
			} else if (currentProgress < 60) {
				setProgressMessage('Analizando contenido...');
			} else if (currentProgress < 80) {
				setProgressMessage('Generando informe...');
			} else {
				setProgressMessage('Finalizando...');
			}
		}, 800); // Actualizar cada 800ms

		try {
			const formData = new FormData();
			formData.append('audio', recordedAudio, `audio-${Date.now()}.webm`);
			formData.append('reportType', reportType);
			formData.append('specialty', specialty);

			const endpoint = customEndpoint || `/api/consultations/${consultationId}/generate-report-from-audio`;
			
			const response = await fetch(
				endpoint,
				{
					method: 'POST',
					body: formData,
				}
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Error al procesar el audio');
			}

			// Limpiar intervalo de progreso
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			
			// Completar progreso
			setProgress(100);
			setProgressMessage('Procesamiento exitoso');
			
			setSuccess('Informe generado exitosamente');
			setRecordedAudio(null);

			// Manejar respuesta de contenido (texto)
			if (result.content && onSuccessContent) {
				onSuccessContent(result.content, result.transcription);
				return;
			}

			// Manejar respuesta de URL (archivo)
			const reportUrl = result.report_url || result.reportUrl;
			
			if (reportUrl) {
				if (onSuccess) {
					onSuccess(reportUrl, result.transcription);
				}

				// Descargar automáticamente el informe si está disponible
				setTimeout(() => {
					try {
						// Intentar descargar usando fetch para obtener el blob
						fetch(reportUrl)
							.then(response => {
								if (!response.ok) throw new Error('Error al descargar el archivo');
								return response.blob();
							})
							.then(blob => {
								const url = window.URL.createObjectURL(blob);
								const link = document.createElement('a');
								link.href = url;
								link.download = `informe-consulta-${consultationId}-${new Date().toISOString().split('T')[0]}.docx`;
								link.style.display = 'none';
								document.body.appendChild(link);
								link.click();
								document.body.removeChild(link);
								// Limpiar la URL del objeto después de un tiempo
								setTimeout(() => window.URL.revokeObjectURL(url), 100);
							})
							.catch(downloadError => {
								console.warn('Error al descargar automáticamente:', downloadError);
								// Si falla, abrir en nueva pestaña como fallback
								window.open(reportUrl, '_blank');
							});
					} catch (error) {
						console.warn('Error al iniciar descarga automática:', error);
						// Si falla, abrir en nueva pestaña como fallback
						window.open(reportUrl, '_blank');
					}
				}, 1500); // Esperar 1.5 segundos para asegurar que el archivo esté disponible
			} else if (!onSuccessContent) {
				// Si no hay URL ni handler de contenido, lanzar error (a menos que sea solo transcripción pero no es el caso usual)
				throw new Error('No se recibió la URL del informe generado');
			}

			// Limpiar después de 5 segundos
			setTimeout(() => {
				setSuccess(null);
			}, 5000);

		} catch (err: any) {
			// Limpiar intervalo de progreso
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			
			console.error('Error al enviar audio:', err);
			const errorMessage = err.message || 'Error al procesar el audio. Intenta nuevamente.';
			setError(errorMessage);
			setProgress(0);
			setProgressMessage('');
			if (onError) {
				onError(errorMessage);
			}
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
			{/* Botón de grabar/detener - Diseño mejorado con énfasis en IA */}
			{!recordedAudio && (
				<div className="flex flex-col gap-3">
					{!isRecording ? (
						<button
							type="button"
							onClick={startRecording}
							disabled={isProcessing}
							className="group relative flex flex-col items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 text-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden transform hover:scale-105 active:scale-100"
						>
							{/* Efecto de brillo animado */}
							<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
							
							{/* Contenido del botón */}
							<div className="relative z-10 flex items-center gap-3">
								<div className="relative">
									<Mic size={24} className="animate-pulse" />
									<Sparkles size={12} className="absolute -top-1 -right-1 text-yellow-300 animate-ping" />
								</div>
								<div className="flex flex-col items-start">
									<span className="text-lg font-bold">Generar Informe con IA</span>
									<span className="text-xs text-white/80 font-medium">Grabar audio de la consulta</span>
								</div>
							</div>
							
							{/* Badge de IA */}
							<div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
								<Brain size={12} className="text-yellow-300" />
								<span className="text-[10px] font-bold uppercase tracking-wide">IA 2026</span>
							</div>
						</button>
					) : (
						<div className="flex flex-col gap-3">
							<button
								type="button"
								onClick={stopRecording}
								className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:scale-105 active:scale-100"
							>
								{/* Efecto de pulso rojo */}
								<div className="absolute inset-0 bg-red-500 rounded-xl animate-ping opacity-20" />
								
								<div className="relative z-10 flex items-center gap-3">
									<Square size={20} className="fill-current" />
									<span className="text-lg font-bold">Detener Grabación</span>
								</div>
							</button>
							
							{/* Indicador de tiempo con diseño mejorado */}
							<div className="flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl">
								<div className="relative">
									<div className="w-4 h-4 bg-red-600 rounded-full animate-pulse" />
									<div className="absolute inset-0 w-4 h-4 bg-red-600 rounded-full animate-ping opacity-75" />
								</div>
								<div className="flex flex-col items-center">
									<span className="text-2xl font-bold text-red-600 tabular-nums">{formatTime(recordingTime)}</span>
									<span className="text-xs text-gray-600 font-medium">Grabando...</span>
								</div>
							</div>
						</div>
					)}
					
					{/* Mensaje informativo sobre IA */}
					{!isRecording && (
						<div className="flex items-start gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
							<Zap size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
							<div className="flex-1">
								<p className="text-xs font-semibold text-gray-800 mb-1">
									✨ Tecnología de Inteligencia Artificial 2026
								</p>
								<p className="text-xs text-gray-600 leading-relaxed">
									La IA transcribe tu audio, extrae la información médica y genera automáticamente el informe completo en formato Word.
								</p>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Audio grabado - Mostrar controles con diseño mejorado */}
			{recordedAudio && !isProcessing && (
				<div className="flex flex-col gap-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-lg">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-green-100 rounded-lg">
								<Check size={20} className="text-green-600" />
							</div>
							<div className="flex flex-col">
								<span className="text-sm font-bold text-gray-800">Audio grabado exitosamente</span>
								<span className="text-xs text-gray-600">{Math.round(recordedAudio.size / 1024)} KB · {formatTime(recordingTime)}</span>
							</div>
						</div>
						<audio
							src={URL.createObjectURL(recordedAudio)}
							controls
							className="max-w-xs rounded-lg"
						/>
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleSubmit}
							disabled={isProcessing}
							className="group relative flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden transform hover:scale-105 active:scale-100"
						>
							{/* Efecto de brillo animado */}
							<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
							
							<div className="relative z-10 flex items-center gap-3">
								{isProcessing ? (
									<>
										<Loader2 size={20} className="animate-spin" />
										<span className="font-bold">Procesando con IA...</span>
									</>
								) : (
									<>
										<Sparkles size={20} className="text-yellow-300" />
										<span className="font-bold">Generar Informe con IA</span>
									</>
								)}
							</div>
						</button>

						<button
							type="button"
							onClick={handleCancel}
							disabled={isProcessing}
							className="flex items-center gap-2 px-5 py-4 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
						>
							<X size={18} />
							<span className="font-medium">Cancelar</span>
						</button>
					</div>
					
					{/* Mensaje informativo */}
					<div className="flex items-start gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-green-200">
						<Brain size={14} className="text-purple-600 mt-0.5 flex-shrink-0" />
						<p className="text-xs text-gray-700">
							La IA procesará tu audio y generará automáticamente el informe médico completo.
						</p>
					</div>
				</div>
			)}

			{/* Mensajes de error y éxito */}
			{error && (
				<div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
					<AlertCircle size={16} />
					<span>{error}</span>
				</div>
			)}

			{success && (
				<div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
					<Check size={16} />
					<span>{success}</span>
				</div>
			)}

			{/* Pantalla de carga con barra de progreso - Diseño mejorado */}
			{isProcessing && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
					<div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border-2 border-purple-200">
						<div className="flex flex-col items-center gap-6">
							{/* Icono de IA animado */}
							<div className="relative">
								<div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-xl opacity-50 animate-pulse" />
								<div className="relative bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-2xl">
									<Brain size={48} className="text-white animate-pulse" />
									<Sparkles size={16} className="absolute -top-1 -right-1 text-yellow-300 animate-ping" />
								</div>
							</div>
							
							<div className="w-full">
								<h3 className="text-xl font-bold text-gray-900 mb-1 text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
									Generando Informe con IA
								</h3>
								<p className="text-sm text-gray-600 mb-1 text-center font-medium">
									{progressMessage}
								</p>
								<p className="text-xs text-gray-500 mb-4 text-center">
									Tecnología de Inteligencia Artificial 2026
								</p>
								
								{/* Barra de progreso mejorada */}
								<div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
									<div
										className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 transition-all duration-300 ease-out rounded-full relative overflow-hidden"
										style={{ width: `${progress}%` }}
									>
										{/* Efecto de brillo animado */}
										<div 
											className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
											style={{
												animation: 'shimmer 2s infinite',
											}}
										/>
									</div>
								</div>
								
								<div className="flex items-center justify-between mt-3">
									<p className="text-xs font-semibold text-gray-700">
										Progreso
									</p>
									<p className="text-sm font-bold text-purple-600 tabular-nums">
										{Math.round(progress)}%
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

