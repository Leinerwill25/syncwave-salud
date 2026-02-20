/** @refactored ASHIRA Clinic Dashboard - DataTable */
'use client';

import React from 'react';

export interface Column<T = Record<string, unknown>> {
	key: string;
	header: string;
	render?: (value: unknown, row: T) => React.ReactNode;
	className?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
	columns: Column<T>[];
	data: T[];
	emptyState?: React.ReactNode;
	className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
	columns,
	data,
	emptyState,
	className = '',
}: DataTableProps<T>) {
	if (data.length === 0 && emptyState) {
		return <>{emptyState}</>;
	}

	return (
		<div className={`overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}>
			<table className="min-w-full w-full divide-y divide-slate-100">
				<thead>
					<tr className="bg-slate-50">
						{columns.map((col) => (
							<th
								key={col.key}
								className={`text-left px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 ${col.className ?? ''}`}
							>
								{col.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-50">
					{data.map((row, rowIdx) => (
						<tr
							key={rowIdx}
							className="hover:bg-slate-50 transition-colors"
						>
							{columns.map((col) => (
								<td
									key={col.key}
									className={`px-5 py-4 text-sm text-slate-700 align-middle ${col.className ?? ''}`}
								>
									{col.render
										? col.render(row[col.key], row)
										: String(row[col.key] ?? '—')}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default DataTable;
