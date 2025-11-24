// app/api/plans/route.ts
// API para obtener planes disponibles desde la base de datos

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const role = searchParams.get('role'); // 'MEDICO', 'PACIENTE', etc.
		const specialistCount = searchParams.get('specialistCount'); // Para organizaciones

		// Obtener todos los planes activos
		const plans = await prisma.plan.findMany({
			orderBy: [
				{ monthlyPrice: 'asc' },
			],
		});

		// Filtrar planes según el rol y contexto
		let filteredPlans = plans;

		if (role === 'MEDICO') {
			// Para médicos, buscar plan con slug 'medico' específicamente
			filteredPlans = plans.filter((plan) => plan.slug === 'medico');
		} else if (role === 'PACIENTE') {
			// Para pacientes, no devolver planes (son gratuitos)
			filteredPlans = [];
		} else if (role && specialistCount) {
			// Para organizaciones, filtrar por rango de especialistas
			const count = parseInt(specialistCount, 10);
			filteredPlans = plans.filter(
				(plan) =>
					(plan.minSpecialists === 0 || plan.minSpecialists <= count) &&
					(plan.maxSpecialists === 0 || plan.maxSpecialists >= count)
			);
		}

		return NextResponse.json({
			success: true,
			plans: filteredPlans.map((plan) => ({
				id: plan.id,
				slug: plan.slug,
				name: plan.name,
				minSpecialists: plan.minSpecialists,
				maxSpecialists: plan.maxSpecialists,
				monthlyPrice: plan.monthlyPrice,
				quarterlyPrice: plan.quarterlyPrice,
				annualPrice: plan.annualPrice,
				description: plan.description,
			})),
		});
	} catch (error) {
		console.error('[Plans API] Error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
		return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
	} finally {
		await prisma.$disconnect();
	}
}

