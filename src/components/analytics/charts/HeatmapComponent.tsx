'use client';

import React from 'react';

interface HeatmapComponentProps {
  data: { x: string; y: string; value: number }[];
  xLabels: string[];
  yLabels: string[];
  title: string;
  subtitle?: string;
}

export function HeatmapComponent({ data, xLabels, yLabels, title, subtitle }: HeatmapComponentProps) {
  const getColor = (value: number, max: number) => {
    const intensity = value / max;
    if (intensity > 0.7) return 'bg-red-500';
    if (intensity > 0.4) return 'bg-yellow-500';
    if (intensity > 0.1) return 'bg-blue-500';
    return 'bg-gray-200';
  };

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
              {xLabels.map((label, idx) => (
                <th key={idx} className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yLabels.map((yLabel, yIdx) => (
              <tr key={yIdx}>
                <td className="px-3 py-2 text-xs font-medium text-gray-700">{yLabel}</td>
                {xLabels.map((xLabel, xIdx) => {
                  const item = data.find(d => d.x === xLabel && d.y === yLabel);
                  const value = item?.value || 0;
                  return (
                    <td key={xIdx} className="px-3 py-2">
                      <div
                        className={`${getColor(value, maxValue)} text-white text-center rounded p-2 min-w-[50px]`}
                        title={`${xLabel} - ${yLabel}: ${value}`}
                      >
                        {value}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

