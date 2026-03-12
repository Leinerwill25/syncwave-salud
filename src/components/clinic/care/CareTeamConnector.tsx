
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { 
    Users, 
    Stethoscope, 
    User, 
    Mail, 
    ArrowRight, 
    Plus, 
    X, 
    CheckCircle2, 
    Brain,
    HandMetal,
    Target,
    Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    identifier: string;
    type: 'REG' | 'UNREG';
}

interface Professional {
    id: string;
    full_name: string;
    role: 'MEDICO' | 'ENFERMERO';
    email: string;
}

interface Assignment {
    id: string;
    patient_id: string | null;
    unregistered_patient_id: string | null;
    professional_id: string;
    professional_role: string;
    status: 'ACTIVE' | 'INACTIVE';
}

interface CareTeamConnectorProps {
    patients: Patient[];
    professionals: Professional[];
    assignments: Assignment[];
    onAssign: (patientId: string, isUnreg: boolean, profId: string, role: string) => Promise<void>;
    onRemove: (patientId: string, isUnreg: boolean, profId: string) => Promise<void>;
}

export default function CareTeamConnector({ 
    patients, 
    professionals, 
    assignments,
    onAssign,
    onRemove
}: CareTeamConnectorProps) {
    const [draggingFrom, setDraggingFrom] = useState<{ id: string; type: 'REG' | 'UNREG'; name: string } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const patientRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const profRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Track mouse position for the "interactive line"
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (draggingFrom && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setMousePos({ 
                    x: e.clientX - rect.left, 
                    y: e.clientY - rect.top 
                });
            }
        };

        if (draggingFrom) {
            window.addEventListener('mousemove', handleMouseMove);
        }
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [draggingFrom]);

    const activeAssignments = useMemo(() => {
        return assignments.filter(a => a.status === 'ACTIVE');
    }, [assignments]);

    // Calculate line coordinates for existing assignments
    const lines = useMemo(() => {
        if (!containerRef.current) return [];
        const rect = containerRef.current.getBoundingClientRect();

        return activeAssignments.map(asg => {
            const pId = asg.patient_id || asg.unregistered_patient_id;
            const profId = asg.professional_id;

            const pEl = patientRefs.current[pId!];
            const prEl = profRefs.current[profId];

            if (pEl && prEl) {
                const pRect = pEl.getBoundingClientRect();
                const prRect = prEl.getBoundingClientRect();

                return {
                    id: asg.id,
                    x1: (pRect.left + pRect.width) - rect.left,
                    y1: (pRect.top + pRect.height / 2) - rect.top,
                    x2: prRect.left - rect.left,
                    y2: (prRect.top + prRect.height / 2) - rect.top,
                    role: asg.professional_role
                };
            }
            return null;
        }).filter(Boolean);
    }, [activeAssignments, patients, professionals]);

    return (
        <div 
            ref={containerRef}
            className="relative grid grid-cols-12 gap-8 min-h-[600px] p-8 bg-white/50 backdrop-blur-xl rounded-[40px] border border-slate-200/60 overflow-hidden"
        >
            {/* SVG Overlay for Lines */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
                <defs>
                    <linearGradient id="lineGradMedic" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="lineGradNurse" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    </linearGradient>
                </defs>

                {/* Existing Connections */}
                {lines.map((l: any) => (
                    <motion.path
                        key={l.id}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        d={`M ${l.x1} ${l.y1} C ${l.x1 + 100} ${l.y1}, ${l.x2 - 100} ${l.y2}, ${l.x2} ${l.y2}`}
                        stroke={l.role === 'MEDICO' ? "url(#lineGradMedic)" : "url(#lineGradNurse)"}
                        strokeWidth="2.5"
                        fill="none"
                        strokeDasharray="8 6"
                        className="drop-shadow-sm"
                    />
                ))}

                {/* Live Dragging Line */}
                {draggingFrom && (
                    <line 
                        x1={lines.find((l: any) => l.id?.includes(draggingFrom.id))?.x1 || 0} // Placeholder, will fix below
                        y1={0} // Fixed later with dynamic start post
                        x2={mousePos.x}
                        y2={mousePos.y}
                        stroke="#0d9488"
                        strokeWidth="3"
                        strokeDasharray="6 4"
                        opacity="0.5"
                    />
                )}
            </svg>

            {/* Left Column: Patients */}
            <div className="col-span-4 space-y-4 z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-teal-50 rounded-2xl text-teal-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">Pacientes</h3>
                </div>

                {patients.map(patient => (
                    <motion.div
                        key={patient.id}
                        ref={el => { patientRefs.current[patient.id] = el }}
                        whileHover={{ x: 5 }}
                        className={cn(
                            "group p-5 bg-white rounded-3xl border transition-all cursor-pointer select-none",
                            draggingFrom?.id === patient.id 
                                ? "border-teal-500 ring-4 ring-teal-500/10 shadow-lg" 
                                : "border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200"
                        )}
                        onMouseDown={() => setDraggingFrom({ id: patient.id, type: patient.type, name: `${patient.first_name} ${patient.last_name}` })}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700">{patient.first_name} {patient.last_name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{patient.identifier}</p>
                                </div>
                            </div>
                            {patient.type === 'UNREG' && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[9px] font-black uppercase">Sin Registro</span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Middle: Empty space for lines */}
            <div className="col-span-4" />

            {/* Right Column: Professionals */}
            <div className="col-span-4 space-y-4 z-10">
                <div className="flex items-center gap-3 mb-6 justify-end">
                    <h3 className="text-xl font-black text-slate-800">Especialistas</h3>
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                </div>

                {professionals.map(prof => (
                    <motion.div
                        key={prof.id}
                        ref={el => { profRefs.current[prof.id] = el }}
                        whileHover={{ scale: 1.02 }}
                        onMouseUp={() => {
                            if (draggingFrom) {
                                onAssign(draggingFrom.id, draggingFrom.type === 'UNREG', prof.id, prof.role);
                                setDraggingFrom(null);
                            }
                        }}
                        className={cn(
                            "group p-5 bg-white rounded-3xl border border-slate-100 shadow-sm transition-all",
                            prof.role === 'MEDICO' ? "hover:border-teal-200" : "hover:border-indigo-200"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                    prof.role === 'MEDICO' ? "bg-teal-50 text-teal-600" : "bg-indigo-50 text-indigo-600"
                                )}>
                                    {prof.role === 'MEDICO' ? <Stethoscope className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700">{prof.full_name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{prof.role}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Instruction Overlay when Dragging */}
            <AnimatePresence>
                {draggingFrom && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-8 py-4 rounded-3xl z-50 flex items-center gap-4 shadow-2xl"
                    >
                        <div className="p-2 bg-teal-500 rounded-xl">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Conectando a {draggingFrom.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Suelta sobre un profesional para asignar</p>
                        </div>
                        <button 
                            onClick={() => setDraggingFrom(null)}
                            className="ml-4 p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
