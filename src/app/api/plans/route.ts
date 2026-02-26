// app/api/plans/route.ts
// API para obtener planes disponibles desde la base de datos

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
	? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
	  })
	: null;

export async function GET(request: Request) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json({ success: false, error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const { searchParams } = new URL(request.url);
		const role = searchParams.get('role'); // 'MEDICO', 'PACIENTE', etc.
		const specialistCount = searchParams.get('specialistCount'); // Para organizaciones

		// Obtener todos los planes activos usando Supabase
		// Según Database.sql: Plan tiene: id, slug, name, minSpecialists, maxSpecialists, monthlyPrice, quarterlyPrice, annualPrice, description
		const { data: plans, error: plansError } = await supabaseAdmin
			.from('plan')
			.select('id, slug, name, minSpecialists, maxSpecialists, monthlyPrice, quarterlyPrice, annualPrice, description')
			.order('monthlyPrice', { ascending: true });

		if (plansError) {
			console.error('[Plans API] Error obteniendo planes:', plansError);
			return NextResponse.json({ success: false, error: 'Error al obtener planes' }, { status: 500 });
		}

		// Filtrar planes según el rol y contexto
		let filteredPlans = plans || [];

		if (role === 'MEDICO') {
			// Para médicos, buscar plan con slug 'medico' específicamente
			filteredPlans = filteredPlans.filter((plan) => plan.slug === 'medico');
		} else if (role === 'ENFERMERO') {
			// Para enfermeros, buscar plan con slug 'enfermero-independiente' específicamente
			filteredPlans = filteredPlans.filter((plan) => plan.slug === 'enfermero-independiente');
		} else if (role === 'PACIENTE') {
			// Para pacientes, no devolver planes (son gratuitos)
			filteredPlans = [];
		} else if (role === 'ADMIN' || role === 'FARMACIA' || role === 'LABORATORIO') {
			// Para organizaciones, excluimos planes de medico, enfermero y paciente
			filteredPlans = filteredPlans.filter(p => !['medico', 'enfermero-independiente', 'paciente', 'paciente-individual', 'paciente-family', 'paciente-gratis'].includes(p.slug));
			
			// Si hay specialistCount, filtramos por rango
			if (specialistCount) {
				const count = parseInt(specialistCount, 10);
				if (!isNaN(count) && count > 0) {
					filteredPlans = filteredPlans.filter(
						(plan) =>
							(plan.minSpecialists === 0 || plan.minSpecialists <= count) &&
							(plan.maxSpecialists === 0 || plan.maxSpecialists >= count)
					);
				}
			}
		} else if (role && specialistCount) {
			// Fallback legacy logic
			const count = parseInt(specialistCount, 10);
			filteredPlans = filteredPlans.filter(
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
	}
}

