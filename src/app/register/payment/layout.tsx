// Layout específico para la página de pago
// Forzar renderizado dinámico ya que usa searchParams y localStorage
export const dynamic = 'force-dynamic';

export default function PaymentLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}

