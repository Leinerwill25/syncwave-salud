'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, DollarSign, X, ArrowRight, TrendingUp } from 'lucide-react';
import { useCurrencyRate } from '@/hooks/useCurrencyRate';

export default function CurrencyFloatingWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState<string>('1');
    const [calculatorMode, setCalculatorMode] = useState<'USD' | 'EUR'>('USD');

    // Fechas desde el API (o simular la carga)
    const [rates, setRates] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/currency/available');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.currencies)) {
                        const newRates: Record<string, number> = {};
                        data.currencies.forEach((c: any) => {
                            newRates[c.code] = Number(c.rate);
                        });
                        setRates(newRates);
                    }
                }
            } catch (error) {
                console.error('Error fetching currency rates:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && Object.keys(rates).length === 0) {
            fetchRates();
        }
    }, [isOpen]);

    const activeRate = rates[calculatorMode] || 0;
    const bsValue = (Number(amount || 0) * activeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-2"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between text-white">
                            <div className="flex items-center gap-2 font-semibold">
                                <TrendingUp size={18} />
                                <span>Tasas BCV</span>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            {/* Rates Display */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => setCalculatorMode('USD')}>
                                    <div className="text-xs font-semibold text-slate-500 mb-1">USD (Dólar)</div>
                                    <div className="text-lg font-bold text-slate-800">
                                        {loading ? '...' : rates['USD'] ? `Bs ${rates['USD'].toFixed(2)}` : 'N/A'}
                                    </div>
                                    <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-2 ${calculatorMode === 'USD' ? 'bg-emerald-500' : 'bg-transparent'}`} />
                                </div>
                                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setCalculatorMode('EUR')}>
                                    <div className="text-xs font-semibold text-slate-500 mb-1">EUR (Euro)</div>
                                    <div className="text-lg font-bold text-slate-800">
                                        {loading ? '...' : rates['EUR'] ? `Bs ${rates['EUR'].toFixed(2)}` : 'N/A'}
                                    </div>
                                    <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-2 ${calculatorMode === 'EUR' ? 'bg-blue-500' : 'bg-transparent'}`} />
                                </div>
                            </div>

                            {/* Calculator */}
                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-xs font-semibold text-slate-500 mb-2">Calculadora Rápida</div>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                                            {calculatorMode === 'USD' ? '$' : '€'}
                                        </div>
                                        <input 
                                            type="number" 
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                                        />
                                    </div>
                                    <ArrowRight size={16} className="text-slate-400 shrink-0" />
                                    <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 text-center truncate">
                                        Bs {bsValue}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg text-white transition-all transform hover:scale-105 active:scale-95 ${
                    isOpen ? 'bg-slate-800 rotate-180' : 'bg-gradient-to-r from-emerald-600 to-teal-600'
                }`}
            >
                {isOpen ? <X size={24} /> : <Calculator size={24} />}
            </button>
        </div>
    );
}
