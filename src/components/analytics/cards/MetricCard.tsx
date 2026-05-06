import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
  delay?: number;
  isCurrency?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  subtitle, 
  className,
  delay = 0,
  isCurrency = false 
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!change) return null;
    
    const iconClass = "w-4 h-4";
    if (change.trend === 'up') return <TrendingUp className={iconClass} />;
    if (change.trend === 'down') return <TrendingDown className={iconClass} />;
    return <Minus className={iconClass} />;
  };

  const getTrendBg = () => {
    if (!change) return '';
    if (change.trend === 'up') return 'bg-emerald-50 text-emerald-700';
    if (change.trend === 'down') return 'bg-rose-50 text-rose-700';
    return 'bg-slate-50 text-slate-700';
  };

  const formattedValue = typeof value === 'number' && isCurrency
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
    : value;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 hover:shadow-xl transition-all duration-300 relative overflow-hidden group",
        className
      )}
    >
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-slate-50 rounded-full group-hover:bg-slate-100 transition-colors"></div>
      
      <div className="relative flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white group-hover:shadow-lg transition-all duration-300">
            {icon}
          </div>
          {change && (
            <div className={cn("px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1", getTrendBg())}>
              {getTrendIcon()}
              {change.value > 0 ? '+' : ''}{change.value}%
            </div>
          )}
        </div>

        <div className="mt-auto">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-4xl font-extrabold text-slate-900 tracking-tight">{formattedValue}</h4>
          </div>
          
          {subtitle ? (
            <p className="text-xs text-slate-500 font-medium mt-2">{subtitle}</p>
          ) : (
             <p className="text-xs text-slate-400 font-medium mt-2 italic">vs. período anterior</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

