import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  subtitle?: string;
}

export function MetricCard({ title, value, change, icon, subtitle }: MetricCardProps) {
  const getTrendIcon = () => {
    if (!change) return null;
    
    const iconClass = "w-4 h-4";
    if (change.trend === 'up') return <TrendingUp className={`${iconClass} text-green-500`} />;
    if (change.trend === 'down') return <TrendingDown className={`${iconClass} text-red-500`} />;
    return <Minus className={`${iconClass} text-gray-500`} />;
  };

  const getTrendColor = () => {
    if (!change) return '';
    if (change.trend === 'up') return 'text-green-600';
    if (change.trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          
          {change && (
            <div className="flex items-center mt-2 text-sm">
              {getTrendIcon()}
              <span className={`${getTrendColor()} font-medium ml-1`}>
                {change.value > 0 ? '+' : ''}{change.value}%
              </span>
              <span className="text-gray-500 ml-1">vs período anterior</span>
            </div>
          )}
          
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        
        {icon && (
          <div className="bg-blue-50 p-3 rounded-lg ml-4">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

