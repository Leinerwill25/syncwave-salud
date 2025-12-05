import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, className }: KPICardProps) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-100 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
        </div>
        <div className="p-3 bg-sky-50 rounded-xl">
          <Icon className="w-6 h-6 text-sky-600" />
        </div>
      </div>
      
      {(subtitle || trend) && (
        <div className="mt-4 flex items-center gap-2">
          {trend && (
            <span className={`text-sm font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
          {subtitle && (
            <span className="text-sm text-slate-400">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
