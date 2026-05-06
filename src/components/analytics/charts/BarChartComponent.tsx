'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface BarChartComponentProps {
  data: any[];
  xKey: string;
  bars: {
    dataKey: string;
    name: string;
    color: string;
  }[];
  title: string;
  subtitle?: string;
  layout?: 'horizontal' | 'vertical';
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-xl border border-slate-100 rounded-2xl">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <p className="text-slate-900 font-bold">
              {entry.name}: <span className="text-slate-600">{entry.value.toLocaleString()}</span>
            </p>
          </div>
        ))}
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

export function BarChartComponent({ 
  data, 
  xKey, 
  bars, 
  title, 
  subtitle, 
  layout = 'horizontal',
  height = 300 
}: BarChartComponentProps) {
  const isVertical = layout === 'vertical';

  return (
    <Card className="rounded-[2rem] overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-slate-800 tracking-tight">{title}</CardTitle>
        {subtitle && <CardDescription className="text-sm font-medium text-slate-500">{subtitle}</CardDescription>}
      </CardHeader>
      
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={data} 
            layout={layout}
            margin={{ top: 5, right: 30, left: isVertical ? 60 : 20, bottom: isVertical ? 5 : 20 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={isVertical} horizontal={!isVertical} />
            
            {isVertical ? (
              <>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey={xKey} 
                  type="category" 
                  stroke="#64748b" 
                  fontSize={12}
                  fontWeight={600}
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
              </>
            ) : (
              <>
                <XAxis 
                  dataKey={xKey} 
                  stroke="#64748b"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={({ x, y, payload }) => (
                     <g transform={`translate(${x},${y})`}>
                        <text 
                          x={0} 
                          y={0} 
                          dy={16} 
                          textAnchor="middle" 
                          fill="#64748b" 
                          className="text-[10px] font-bold"
                          transform="rotate(-25)"
                        >
                          {payload.value}
                        </text>
                     </g>
                  )}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                />
              </>
            )}

            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              content={({ payload }) => (
                <div className="flex justify-end gap-4 mb-4">
                  {payload?.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{entry.value}</span>
                    </div>
                  ))}
                </div>
              )}
            />
            
            {bars.map((bar) => (
              <Bar 
                key={bar.dataKey}
                dataKey={bar.dataKey} 
                fill={bar.color} 
                name={bar.name}
                radius={isVertical ? [0, 8, 8, 0] : [8, 8, 0, 0]}
                barSize={isVertical ? 20 : 35}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

