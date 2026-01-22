import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TrendCardProps {
  title: string;
  current: number;
  previous: number;
  format?: (value: number) => string;
  subtitle?: string;
}

export function TrendCard({ title, current, previous, format = (v) => v.toString(), subtitle }: TrendCardProps) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const trend = change >= 0 ? 'up' : 'down';
  const absChange = Math.abs(change);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-gray-900">{format(current)}</p>
        <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 mr-1" />
          )}
          <span>{absChange.toFixed(1)}%</span>
        </div>
      </div>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
      )}
    </div>
  );
}

