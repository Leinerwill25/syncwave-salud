/** @refactored ASHIRA Clinic Dashboard - AnalyticsChart */
'use client';

import React from 'react';
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface AnalyticsChartProps {
	type: 'area' | 'bar' | 'pie';
	data: any[];
	dataKey: string;
	categoryKey?: string;
	height?: number;
	colors?: string[];
}

const DEFAULT_COLORS = ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444'];

/* Custom tooltip with premium styling */
function ChartTooltip({ active, payload, label }: any) {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-white shadow-lg rounded-xl border border-slate-100 px-4 py-3 text-sm">
			{label && <p className="font-medium text-slate-900 mb-1">{label}</p>}
			{payload.map((p: any, i: number) => (
				<p key={i} className="text-slate-500">
					{p.name}: <span className="font-semibold text-slate-800">{p.value?.toLocaleString?.() ?? p.value}</span>
				</p>
			))}
		</div>
	);
}

export function AnalyticsChart({
	type,
	data,
	dataKey,
	categoryKey = 'name',
	height = 300,
	colors = DEFAULT_COLORS,
}: AnalyticsChartProps) {
	if (!data || data.length === 0) {
		return (
			<div
				className="flex flex-col items-center justify-center w-full bg-slate-50 rounded-xl border border-dashed border-slate-200 gap-3"
				style={{ height }}
			>
				<BarChart3 className="w-8 h-8 text-slate-300" />
				<p className="text-slate-400 text-sm">No hay datos disponibles</p>
			</div>
		);
	}

	const commonAxisProps = {
		axisLine: false,
		tickLine: false,
		tick: { fill: '#94a3b8', fontSize: 11 },
	};

	if (type === 'area') {
		return (
			<div style={{ width: '100%', height }}>
				<ResponsiveContainer>
					<AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
						<defs>
							<linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={colors[0]} stopOpacity={0.25} />
								<stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
						<XAxis dataKey={categoryKey} {...commonAxisProps} dy={10} />
						<YAxis {...commonAxisProps} />
						<Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
						<Area
							type="monotone"
							dataKey={dataKey}
							stroke={colors[0]}
							strokeWidth={2.5}
							fillOpacity={1}
							fill="url(#areaGradient)"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		);
	}

	if (type === 'bar') {
		return (
			<div style={{ width: '100%', height }}>
				<ResponsiveContainer>
					<BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
						<XAxis dataKey={categoryKey} {...commonAxisProps} dy={10} />
						<YAxis {...commonAxisProps} />
						<Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
						<Bar
							dataKey={dataKey}
							fill={colors[0]}
							radius={[6, 6, 0, 0]}
							barSize={36}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
		);
	}

	if (type === 'pie') {
		return (
			<div style={{ width: '100%', height: height + 60 }}>
				<ResponsiveContainer width="100%" height={height}>
					<PieChart>
						<Pie
							data={data}
							cx="50%"
							cy="50%"
							innerRadius={60}
							outerRadius={85}
							paddingAngle={4}
							dataKey={dataKey}
							strokeWidth={2}
							stroke="#fff"
						>
							{data.map((_entry, index) => (
								<Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
							))}
						</Pie>
						<Tooltip content={<ChartTooltip />} />
					</PieChart>
				</ResponsiveContainer>
				{/* Legend */}
				<div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3 px-2">
					{data.map((entry, index) => (
						<div key={index} className="flex items-center gap-2">
							<div
								className="w-2.5 h-2.5 rounded-full shrink-0"
								style={{ backgroundColor: colors[index % colors.length] }}
							/>
							<span className="text-xs text-slate-600">{entry[categoryKey]}</span>
						</div>
					))}
				</div>
			</div>
		);
	}

	return null;
}
