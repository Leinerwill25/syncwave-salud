'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Calculator, ArrowRight, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';

export function MultiSedeCalculator() {
    const [specialists, setSpecialists] = useState(15);
    const [branches, setBranches] = useState(1);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>('annual');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // --- Logic ---
    const getBasePlan = (count: number) => {
        if (count <= 1) return { name: "Individual", price: 21.00, tier: "Consultorios" }; // Edge case
        if (count <= 10) return { name: "Starter", price: 16.80, tier: "Grupos Pequeños" };
        if (count <= 30) return { name: "Clínica", price: 14.70, tier: "Centros Medianos" };
        if (count <= 80) return { name: "Pro", price: 12.60, tier: "Clínicas Tipo B" };
        if (count <= 200) return { name: "Enterprise", price: 10.50, tier: "Grandes Inst." };
        return { name: "Personalizado", price: 0, tier: "Corporativo" };
    };

    const calculateTotal = () => {
        const plan = getBasePlan(specialists);
        
        // Base Cost
        let baseCost = specialists * plan.price;
        if (plan.name === "Personalizado") baseCost = 0; // Handled separately

        // Branch Cost
        let branchCost = 0;
        let chargeableBranches = 0;
        
        if (branches > 1) {
            // First branch is free.
            // Branches 2-4 cost 45
            // Branches 5-10 cost 30
            // 11+ is Custom
            
            const extraBranches = branches - 1;
            
            const tier1Branches = Math.min(extraBranches, 3); // 2, 3, 4 (3 branches max at this tier)
            const tier2Branches = Math.min(Math.max(extraBranches - 3, 0), 6); // 5, 6, 7, 8, 9, 10 (6 branches max)
            
            branchCost += tier1Branches * 45;
            branchCost += tier2Branches * 30;
            chargeableBranches = tier1Branches + tier2Branches;
        }

        // Cycle Discount
        let discountMultiplier = 1;
        if (billingCycle === 'quarterly') discountMultiplier = 0.9;
        if (billingCycle === 'annual') discountMultiplier = 0.7;

        const totalMonthly_NoDiscount = baseCost + branchCost;
        const totalMonthly_WithDiscount = totalMonthly_NoDiscount * discountMultiplier;

        // Savings Reference (Generic Competitor/Individual ~21/doc)
        const individualCost = specialists * 21; // Reference price
        const monthlySavings = Math.max(0, individualCost - totalMonthly_WithDiscount);

        return {
            basePlan: plan,
            baseCostMonthly: baseCost,
            branchCostMonthly: branchCost,
            totalMonthly: totalMonthly_WithDiscount,
            totalPeriod: totalMonthly_WithDiscount * (billingCycle === 'monthly' ? 1 : billingCycle === 'quarterly' ? 3 : 12),
            monthlySavings,
            chargeableBranches,
            isCustom: plan.name === "Personalizado" || branches > 10,
            individualCost
        };
    };

    const data = calculateTotal();

    // WhatsApp Message Generator
    const waMessage = `Hola, me interesa ASHIRA para mi clínica.
📊 Total de especialistas: ${specialists}
🏢 Número de sedes: ${branches}
💰 Estimado mensual: €${Math.round(data.totalMonthly)}/mes (${billingCycle})
📅 Ciclo preferido: ${billingCycle === 'annual' ? 'Anual' : billingCycle === 'quarterly' ? 'Trimestral' : 'Mensual'}
¿Pueden darme más información y agendar una demo?`;

    const waUrl = `https://wa.me/584124885623?text=${encodeURIComponent(waMessage)}`;

    if (!isClient) return null;

    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden">
             {/* Decorative blob */}
             <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="mb-12 text-center">
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                        Calculadora Oficial
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        Calcula tu inversión exacta
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Ajusta el número de especialistas y sedes para ver cuánto ahorrarías centralizando tu operación con ASHIRA.
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-purple-900/5 border border-slate-200 overflow-hidden flex flex-col lg:flex-row">
                    
                    {/* LEFT COLUMN: Inputs */}
                    <div className="p-8 lg:p-12 w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-slate-100">
                        
                        {/* Specialists Slider */}
                        <div className="mb-10">
                            <div className="flex justify-between items-end mb-4">
                                <label className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                                    <Users className="w-5 h-5 text-purple-600" />
                                    Total de Especialistas
                                </label>
                                <div className="text-3xl font-bold text-purple-600 bg-purple-50 px-4 py-1 rounded-lg border border-purple-100 font-mono">
                                    {specialists}{specialists >= 200 && '+'}
                                </div>
                            </div>
                            <input 
                                type="range" 
                                min="2" 
                                max="200" 
                                value={specialists} 
                                onChange={(e) => setSpecialists(parseInt(e.target.value))}
                                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 hover:accent-purple-500 transition-all"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                                <span>2 (Mínimo)</span>
                                <span>200+ (Corporativo)</span>
                            </div>
                        </div>

                        {/* Branches Slider */}
                        <div className="mb-10">
                            <div className="flex justify-between items-end mb-4">
                                <label className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                                    <Building2 className="w-5 h-5 text-indigo-600" />
                                    Número de Sedes
                                </label>
                                <div className="text-3xl font-bold text-indigo-600 bg-indigo-50 px-4 py-1 rounded-lg border border-indigo-100 font-mono">
                                    {branches}
                                </div>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="11" 
                                value={branches} 
                                onChange={(e) => setBranches(parseInt(e.target.value))}
                                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                                <span>1 (Incluida)</span>
                                <span>11+ (Red)</span>
                            </div>
                        </div>

                        {/* Billing Cycle Toggle */}
                        <div>
                            <label className="block text-slate-700 font-bold mb-4 text-sm uppercase tracking-wide">Ciclo de Facturación</label>
                            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl">
                                {['monthly', 'quarterly', 'annual'].map((cycle) => (
                                    <button
                                        key={cycle}
                                        onClick={() => setBillingCycle(cycle as any)}
                                        className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                                            billingCycle === cycle 
                                                ? 'bg-white text-purple-700 shadow-sm ring-1 ring-slate-200' 
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        {cycle === 'monthly' && 'Mensual'}
                                        {cycle === 'quarterly' && 'Trimestral (-10%)'}
                                        {cycle === 'annual' && 'Anual (-30%)'}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Output */}
                    <div className="p-8 lg:p-12 w-full lg:w-1/2 bg-slate-50/50 flex flex-col justify-center">
                        
                        {data.isCustom ? (
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-200">
                                    <Building2 className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Plan Institucional</h3>
                                <p className="text-slate-600 mb-8 max-w-sm mx-auto">
                                    Para clínicas de gran escala (+200 especialistas o +10 sedes) ofrecemos condiciones preferenciales y onboarding dedicado.
                                </p>
                                <a 
                                    href={waUrl} 
                                    target="_blank" 
                                    className="inline-flex items-center justify-center gap-2 w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    Contactar Ventas Corporativas
                                </a>
                            </div>
                        ) : (
                            <>
                                {/* Plan Badge */}
                                <div className="mb-8 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Plan Recomendado</h3>
                                        <div className="text-2xl font-bold text-slate-900">{data.basePlan.name}</div>
                                    </div>
                                    <div className="bg-purple-100 text-purple-700 font-bold px-4 py-2 rounded-lg text-sm border border-purple-200">
                                        €{data.basePlan.price} /esp
                                    </div>
                                </div>

                                {/* Breakdown */}
                                <div className="space-y-4 mb-8 text-sm">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                        <span className="text-slate-600">Base ({specialists} especialistas)</span>
                                        <span className="font-semibold text-slate-900">€{Math.round(data.baseCostMonthly).toLocaleString()} <span className="text-xs text-slate-400 font-normal">/mes</span></span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                        <span className="text-slate-600 flex items-center gap-1">
                                            Add-on Sedes 
                                            {data.chargeableBranches > 0 && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">x{data.chargeableBranches}</span>}
                                        </span>
                                        <span className="font-semibold text-slate-900">
                                            {data.branchCostMonthly > 0 ? `€${data.branchCostMonthly}` : 'Incluido'} 
                                            {data.branchCostMonthly > 0 && <span className="text-xs text-slate-400 font-normal"> /mes</span>}
                                        </span>
                                    </div>

                                    {(billingCycle !== 'monthly') && (
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-200 bg-emerald-50 -mx-2 px-2 rounded py-1">
                                            <span className="text-emerald-700 font-medium">Descuento {billingCycle === 'quarterly' ? 'Trimestral' : 'Anual'}</span>
                                            <span className="font-bold text-emerald-700">-{billingCycle === 'quarterly' ? '10%' : '30%'}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Total */}
                                <div className="mb-8">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-lg font-bold text-slate-700">Estimado Mensual</span>
                                        <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                                            €{Math.round(data.totalMonthly).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-right text-xs text-slate-400">
                                        Facturado {billingCycle === 'monthly' ? 'mensualmente' : billingCycle === 'quarterly' ? `cada 3 meses (€${Math.round(data.totalPeriod).toLocaleString()})` : `anualmente (€${Math.round(data.totalPeriod).toLocaleString()})`}
                                    </p>
                                </div>

                                {/* Comparison Box */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 mb-8 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="bg-emerald-100 p-1.5 rounded-full">
                                            <Wallet className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">Ahorro vs Contratación Individual</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-xs text-slate-500">
                                            Si pagaran por separado: <span className="line-through">€{data.individualCost.toLocaleString()}</span>
                                        </div>
                                        <div className="text-emerald-600 font-bold text-lg">
                                            Ahorras €{Math.round(data.monthlySavings).toLocaleString()}/mes
                                        </div>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(data.totalMonthly / data.individualCost) * 100}%` }}
                                            className="h-full bg-purple-500"
                                        />
                                    </div>
                                    <div className="mt-1 text-right text-[10px] text-slate-400">
                                        Tu costo es solo el {Math.round((data.totalMonthly / data.individualCost) * 100)}% del precio estándar
                                    </div>
                                </div>

                                {/* CTA */}
                                <a 
                                    href={waUrl} 
                                    target="_blank" 
                                    className="group flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                                >
                                    Solicitar este Plan
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Helper icon
function MessageCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
    )
}
