// components/ui/top-clients-card.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function TopClientsCard({ title = 'Top clientes (30d)', clients }: { title?: string; clients: { cliente: string; total: number }[] }) {
	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle className="text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{clients.length === 0 ? (
					<p className="text-sm text-muted-foreground">No hay clientes recientes</p>
				) : (
					<ol className="list-decimal list-inside space-y-2">
						{clients.map((c, i) => (
							<li key={i} className="flex justify-between">
								<span className="truncate pr-4">{c.cliente}</span>
								<span className="font-medium">
									{new Intl.NumberFormat(undefined, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}).format(c.total)}
								</span>
							</li>
						))}
					</ol>
				)}
			</CardContent>
		</Card>
	);
}
