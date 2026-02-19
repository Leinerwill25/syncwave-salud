'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Network, CheckCircle2, Globe, Users, Wallet, Calendar, Bell } from 'lucide-react';

export function MultiSedeExplainer() {
    return (
        <section className="py-24 bg-white border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                    
                    {/* LEFT: Text Content */}
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wide mb-6">
                            <Network className="w-3 h-3" />
                            Infraestructura Distribuida
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                            ¿Tienes más de una sede? <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Centraliza todo el caos.</span>
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            Olvida tener sistemas separados para cada sucursal. ASHIRA unifica toda tu red en un solo panel para el Director Médico, manteniendo la operación de cada sede independiente.
                        </p>

                        <div className="space-y-6">
                            {[
                                { icon: Calendar, title: "Agenda Independiente", desc: "Cada sede tiene sus propios horarios, turnos y reglas." },
                                { icon: Wallet, title: "Cajas Separadas", desc: "Control de ingresos individual por sucursal y consolidado global." },
                                { icon: Users, title: "Staff Local", desc: "Tus recepcionistas solo ven la información de su sede asignada." },
                                { icon: Globe, title: "Página Pública Propia", desc: "Link de agendamiento único para cada dirección física." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:scale-110 transition-all duration-300 border border-slate-100 group-hover:border-indigo-100">
                                        <item.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                    <div>
                                        <h4 className="text-slate-900 font-bold text-sm mb-1">{item.title}</h4>
                                        <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: Visual Diagram */}
                    <div className="relative flex justify-center items-center h-[500px] w-full bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
                         {/* Background Grid */}
                         <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.05]"></div>
                         
                         {/* Central Hub */}
                         <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="relative z-20 flex flex-col items-center"
                         >
                             <div className="w-24 h-24 bg-white rounded-2xl shadow-xl border border-indigo-100 flex flex-col items-center justify-center relative z-20">
                                 <Building2 className="w-10 h-10 text-indigo-600 mb-2" />
                                 <div className="text-[10px] font-bold text-slate-900 uppercase">Matriz</div>
                             </div>
                             <div className="mt-3 px-3 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-full shadow-lg">
                                 Director Médico
                             </div>
                         </motion.div>

                         {/* Branches */}
                         {[1, 2, 3].map((b, i) => {
                             const angle = (i * 120) - 30; // 3 branches distributed
                             const radius = 160;
                             const x = Math.cos(angle * Math.PI / 180) * radius;
                             const y = Math.sin(angle * Math.PI / 180) * radius;

                             return (
                                 <React.Fragment key={b}>
                                     {/* Connector Line */}
                                     <svg className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 overflow-visible">
                                         <motion.line 
                                            x1="0" y1="0" x2={x} y2={y} 
                                            stroke="#cbd5e1" 
                                            strokeWidth="2" 
                                            strokeDasharray="4 4"
                                            className="opacity-50"
                                            initial={{ pathLength: 0 }}
                                            whileInView={{ pathLength: 1 }}
                                            transition={{ duration: 0.8, delay: 0.2 }}
                                         />
                                         <circle cx={x/2} cy={y/2} r="3" fill="#6366f1">
                                            <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
                                         </circle>
                                     </svg>

                                     {/* Branch Node */}
                                     <motion.div 
                                        initial={{ scale: 0, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.3 + (i * 0.2) }}
                                        className="absolute z-20"
                                        style={{ transform: `translate(${x}px, ${y}px)` }}
                                     >
                                         <div className="group relative">
                                            <div className="w-16 h-16 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col items-center justify-center hover:border-indigo-300 hover:scale-110 transition-all cursor-default">
                                                <div className={`w-2 h-2 rounded-full absolute top-2 right-2 ${i === 0 ? 'bg-emerald-500' : 'bg-emerald-500'} animate-pulse`}></div>
                                                <Building2 className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                                            </div>
                                            
                                            {/* Tooltip */}
                                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                                                <div className="font-bold mb-1">Sede {b === 1 ? 'Norte' : b === 2 ? 'Sur' : 'Oeste'}</div>
                                                <div className="text-slate-400">12 Especialistas</div>
                                                <div className="text-emerald-400">Activa</div>
                                            </div>
                                         </div>
                                     </motion.div>
                                 </React.Fragment>
                             );
                         })}

                    </div>
                </div>
            </div>
        </section>
    );
}
