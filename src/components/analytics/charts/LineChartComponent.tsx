'use client';

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface LineChartComponentProps {
  data: any[];
  xKey: string;
  lines: {
    dataKey: string;
    name: string;
    color: string;
    strokeWidth?: number;
  }[];
  title: string;
  subtitle?: string;
  valuePrefix?: string;
}

const CustomTooltip = ({ active, payload, label, valuePrefix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-xl border border-slate-100 rounded-2xl">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{entry.name}</span>
              </div>
              <span className="text-slate-900 font-extrabold text-sm">
                {valuePrefix}{entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

export function LineChartComponent({ 
  data, 
  xKey, 
  lines, 
  title, 
  subtitle,
  valuePrefix = '' 
}: LineChartComponentProps) {
  return (
    <Card className="rounded-[2rem] overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-slate-800 tracking-tight">{title}</CardTitle>
        {subtitle && <CardDescription className="text-sm font-medium text-slate-500">{subtitle}</CardDescription>}
      </CardHeader>
      
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorGray" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f1f5f9" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f1f5f9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey={xKey} 
              stroke="#64748b"
              fontSize={12}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${valuePrefix}${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
            />
            <Tooltip content={<CustomTooltip valuePrefix={valuePrefix} />} />
            {lines.map((line) => (
              <Area 
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorGray)"
                name={line.name}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

