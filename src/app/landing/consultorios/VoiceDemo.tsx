
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Loader2, Sparkles, FileText, CheckCircle2, AlertCircle, X, BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';

export function VoiceDemo() {
    const [status, setStatus] = useState<'idle' | 'instructions' | 'recording' | 'processing' | 'completed' | 'error'>('idle');
    const [transcript, setTranscript] = useState('');
    const [report, setReport] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Check if user already used the demo
    useEffect(() => {
        const hasUsed = localStorage.getItem('ashira_demo_used');
        if (hasUsed === 'true') {
            setStatus('completed');
            setReport('Ya has utilizado tu demostración gratuita. Contáctanos para obtener acceso ilimitado.');
        }
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                await processAudio(audioBlob);
            };

            mediaRecorder.start();
            setStatus('recording');
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            setStatus('error');
            toast.error('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
            if (timerRef.current) clearInterval(timerRef.current);
            setStatus('processing');
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'demo_audio.webm');

        try {
            const response = await fetch('/api/landing/demo-report', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error generating report');

            setTranscript(data.transcription);
            setReport(data.report);
            setStatus('completed');
            localStorage.setItem('ashira_demo_used', 'true');
            toast.success('¡Informe generado con éxito!');

        } catch (error) {
            console.error('Error processing audio:', error);
            setStatus('error');
            toast.error('Hubo un error al generar el informe. Inténtalo de nuevo.');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (status === 'completed' && !report) {
         // Fallback if completed but no report (e.g. from localStorage check on load with no saved report)
         // Actually, if loaded from localStorage, we might not show the report, just the "contact us".
         // Let's handle reusable state better? No, stick to one-time.
    }

    return (
        <div className="w-full max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
                {status === 'idle' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative"
                    >
                        {/* Central Card (Static Visualization Look) */}
                        <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl relative z-10 overflow-hidden group">
                            
                            {/* Visual Hint for Desktop */}
                            <div className="absolute top-4 right-4 z-40">
                                <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center gap-2 text-xs font-medium text-teal-300">
                                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping"></div>
                                    Demo Interactiva
                                </div>
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="text-slate-300 font-mono text-sm">Grabando...</span>
                                </div>
                                <Mic className="w-5 h-5 text-teal-400" />
                            </div>

                            {/* Waveform Visualization */}
                            <div className="flex items-center justify-center gap-1 h-16 mb-8">
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ height: [10, 40, 10] }}
                                        transition={{ 
                                            duration: 1, 
                                            repeat: Infinity, 
                                            delay: i * 0.05,
                                            ease: "easeInOut"
                                        }}
                                        className="w-1.5 bg-teal-500 rounded-full"
                                    />
                                ))}
                            </div>

                            {/* Transformation Arrow */}
                            <div className="flex justify-center -my-5 relative z-20">
                                <div className="bg-slate-900 rounded-full p-3 border border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.5)]">
                                    <BrainCircuit className="w-6 h-6 text-teal-400" />
                                </div>
                            </div>

                            {/* Result Preview */}
                            <div className="bg-white rounded-xl p-6 mt-4 shadow-inner relative">
                                <div className="flex items-center gap-3 mb-4">
                                    <FileText className="w-8 h-8 text-blue-600" />
                                    <div>
                                        <div className="h-2 w-24 bg-slate-200 rounded mb-1"></div>
                                        <div className="h-2 w-16 bg-slate-200 rounded"></div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 opacity-50 blur-[1px]">
                                    <div className="p-2 bg-blue-500/10 rounded border-l-4 border-blue-500">
                                        <div className="text-[10px] text-blue-800 font-bold mb-1">MOTIVO CONSULTA</div>
                                        <div className="text-xs text-slate-700 font-medium">Dolor abdominal agudo...</div>
                                    </div>
                                    <div className="p-2 bg-teal-500/10 rounded border-l-4 border-teal-500">
                                        <div className="text-[10px] text-teal-800 font-bold mb-1">DIAGNÓSTICO</div>
                                        <div className="text-xs text-slate-700 font-medium">Gastritis erosiva...</div>
                                    </div>
                                </div>
                                
                                {/* Overlay Text */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                     <p className="text-slate-900 font-bold text-lg bg-white/80 px-4 py-2 rounded-lg shadow-sm">
                                        Generando Informe...
                                     </p>
                                </div>
                            </div>
                        </div>

                        <p className="mt-6 text-center text-sm text-slate-400">
                            Prueba la demo interactiva • Sin registro
                        </p>

                        <div className="mt-8 flex justify-center">
                            <button 
                                onClick={() => setStatus('instructions')}
                                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full font-bold text-lg shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden"
                            >
                                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                                <Mic className="w-6 h-6 animate-pulse" />
                                <span className="relative">Probar Tecnología IA Gratis</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {status === 'instructions' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border border-slate-100 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-blue-500"></div>
                        <button 
                            onClick={() => setStatus('idle')}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Tu Voz es la Nueva Pluma</h3>
                            <p className="text-slate-600">
                                Experimenta cómo ASHIRA transforma tu voz en un informe médico estructurado en segundos.
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Guión sugerido (Léelo en voz alta):</p>
                            <p className="text-lg text-slate-800 font-medium leading-relaxed font-serif italic">
                                "Paciente Juan Pérez, de 30 años, cédula 12.345.678. Acude por dolor de cabeza intenso desde hace 3 días, acompañado de mareos y visión borrosa. Al examen físico presenta tensión arterial de 140/90. Se indica reposo y analgésicos."
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <button 
                                onClick={startRecording}
                                className="flex items-center gap-3 px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all transform hover:scale-105 animate-bounce-slow"
                            >
                                <Mic className="w-5 h-5" />
                                <span>Empezar Grabación</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {status === 'recording' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto border border-red-100 text-center"
                    >
                        <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                            <div className="absolute inset-2 bg-red-500 rounded-full animate-pulse opacity-40"></div>
                            <div className="relative bg-white p-4 rounded-full shadow-sm z-10">
                                <Mic className="w-8 h-8 text-red-500" />
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Grabando...</h3>
                        <p className="text-3xl font-mono font-bold text-slate-700 mb-8">{formatTime(recordingTime)}</p>
                        
                        <button 
                            onClick={stopRecording}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                        >
                            <Square className="w-5 h-5 fill-current" />
                            <span>Terminar y Generar</span>
                        </button>
                    </motion.div>
                )}

                {status === 'processing' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto text-center"
                    >
                        <Loader2 className="w-16 h-16 text-teal-500 animate-spin mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Generando Informe...</h3>
                        <p className="text-slate-500">La IA está estructurando y analizando tu consulta.</p>
                    </motion.div>
                )}

                {(status === 'completed' || (status === 'error' && report)) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl mx-auto border border-slate-200"
                    >
                        {/* Header */}
                        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-500 p-2 rounded-lg">
                                    <CheckCircle2 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Informe Generado Exitosamente</h3>
                                    <p className="text-slate-400 text-xs">Basado en tu grabación de voz</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-mono text-slate-400 block">DEMO MODE</span>
                                <span className="text-xs text-emerald-400 font-bold">1/1 Consultas Gratuitas</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 bg-slate-50 relative">
                            {/* Paper Effect */}
                            <div className="bg-white shadow-sm border border-slate-200 p-8 min-h-[400px] font-serif text-slate-800 text-sm leading-relaxed whitespace-pre-wrap relative">
                                {/* Watermark */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                    <span className="text-6xl font-bold -rotate-12">ASHIRA DEMO</span>
                                </div>
                                <div className="absolute top-0 left-8 w-px h-full bg-red-100/50"></div>
                                
                                {report}
                            </div>
                        </div>

                        {/* Footer CTA */}
                        <div className="p-6 bg-white border-t border-slate-100 text-center">
                            <p className="text-slate-600 mb-4">¿Increíble, verdad? Esto es solo el principio.</p>
                            <a href="https://wa.me/584124885623?text=Hola,%20acabo%20de%20probar%20la%20demo%20de%20ASHIRA%20y%20quiero%20saber%20m%C3%A1s." target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-emerald-200">
                                <span>Obtener Acceso Ilimitado</span>
                            </a>
                        </div>
                    </motion.div>
                )}
                
                {status === 'error' && !report && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-red-50 rounded-xl p-6 max-w-md mx-auto text-center border border-red-100"
                    >
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-red-700 mb-2">Algo salió mal</h3>
                        <p className="text-red-600 mb-4">No se pudo procesar tu audio. Por favor verifica tu micrófono e inténtalo de nuevo.</p>
                        <button 
                            onClick={() => setStatus('idle')}
                            className="px-6 py-2 bg-white text-red-600 border border-red-200 rounded-lg font-bold hover:bg-red-50 transition-colors"
                        >
                            Intentar Nuevamente
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
