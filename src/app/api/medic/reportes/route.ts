// app/api/medic/reportes/route.ts
// API para generar reportes del médico

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';
import { ratesSupabase } from '@/lib/rates-client';

// GET - Obtener reportes del médico
export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(req.url);
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');

		console.log('[Medic Reportes API] Fechas recibidas del frontend:', {
			startDate,
			endDate,
			fecha_actual: new Date().toISOString(),
			anio_actual: new Date().getFullYear(),
		});

		// Crear fechas en UTC para evitar problemas de zona horaria
		// Parsear fecha en formato YYYY-MM-DD
		let start: Date;
		let end: Date;
		
		if (startDate) {
			const [year, month, day] = startDate.split('-').map(Number);
			start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
		} else {
			const now = new Date();
			start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
		}
		
		if (endDate) {
			const [year, month, day] = endDate.split('-').map(Number);
			end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
		} else {
			const now = new Date();
			end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
		}

		console.log('[Medic Reportes API] Iniciando consultas:', {
			doctor_id: user.userId,
			rango: { start: start.toISOString(), end: end.toISOString() },
			start_parsed: { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1, day: start.getUTCDate() },
			end_parsed: { year: end.getUTCFullYear(), month: end.getUTCMonth() + 1, day: end.getUTCDate() },
		});

		// Citas por mes - Obtener todas las citas del doctor y filtrar por fecha después
		const { data: allAppointments, error: appointmentsError } = await supabase
			.from('appointment')
			.select('id, scheduled_at, created_at, status')
			.eq('doctor_id', user.userId);

		if (appointmentsError) {
			console.error('[Medic Reportes API] Error obteniendo citas:', appointmentsError);
		}

		// Filtrar por rango de fechas usando scheduled_at o created_at como fallback
		// Comparar solo la fecha (sin hora) para evitar problemas de zona horaria
		const appointments = (allAppointments || []).filter((apt: any) => {
			const fecha = apt.scheduled_at || apt.created_at;
			if (!fecha) return false;
			
			const fechaDate = new Date(fecha);
			// Normalizar a UTC para comparar solo fechas
			const fechaUTC = new Date(Date.UTC(
				fechaDate.getUTCFullYear(),
				fechaDate.getUTCMonth(),
				fechaDate.getUTCDate()
			));
			const startUTC = new Date(Date.UTC(
				start.getUTCFullYear(),
				start.getUTCMonth(),
				start.getUTCDate()
			));
			const endUTC = new Date(Date.UTC(
				end.getUTCFullYear(),
				end.getUTCMonth(),
				end.getUTCDate()
			));
			
			const inRange = fechaUTC >= startUTC && fechaUTC <= endUTC;
			
			// Log para depuración
			if (allAppointments && allAppointments.length > 0 && allAppointments.length <= 5) {
				console.log('[Medic Reportes API] Cita:', {
					id: apt.id,
					scheduled_at: apt.scheduled_at,
					created_at: apt.created_at,
					fecha_usada: fecha,
					fechaUTC: fechaUTC.toISOString(),
					startUTC: startUTC.toISOString(),
					endUTC: endUTC.toISOString(),
					inRange,
				});
			}
			
			return inRange;
		});

		console.log('[Medic Reportes API] Citas encontradas:', {
			total: allAppointments?.length || 0,
			en_rango: appointments.length,
		});

		// Consultas por mes - Obtener todas las consultas del doctor y filtrar por fecha después
		const { data: allConsultations, error: consultationsError } = await supabase
			.from('consultation')
			.select('id, started_at, created_at, diagnosis')
			.eq('doctor_id', user.userId);

		if (consultationsError) {
			console.error('[Medic Reportes API] Error obteniendo consultas:', consultationsError);
		}

		// Filtrar por rango de fechas usando started_at o created_at como fallback
		// Comparar solo la fecha (sin hora) para evitar problemas de zona horaria
		const consultations = (allConsultations || []).filter((cons: any) => {
			const fecha = cons.started_at || cons.created_at;
			if (!fecha) return false;
			
			const fechaDate = new Date(fecha);
			// Normalizar a UTC para comparar solo fechas
			const fechaUTC = new Date(Date.UTC(
				fechaDate.getUTCFullYear(),
				fechaDate.getUTCMonth(),
				fechaDate.getUTCDate()
			));
			const startUTC = new Date(Date.UTC(
				start.getUTCFullYear(),
				start.getUTCMonth(),
				start.getUTCDate()
			));
			const endUTC = new Date(Date.UTC(
				end.getUTCFullYear(),
				end.getUTCMonth(),
				end.getUTCDate()
			));
			
			const inRange = fechaUTC >= startUTC && fechaUTC <= endUTC;
			
			// Log para depuración
			if (allConsultations && allConsultations.length > 0 && allConsultations.length <= 5) {
				console.log('[Medic Reportes API] Consulta:', {
					id: cons.id,
					started_at: cons.started_at,
					created_at: cons.created_at,
					fecha_usada: fecha,
					fechaUTC: fechaUTC.toISOString(),
					startUTC: startUTC.toISOString(),
					endUTC: endUTC.toISOString(),
					inRange,
				});
			}
			
			return inRange;
		});

		console.log('[Medic Reportes API] Consultas encontradas:', {
			total: allConsultations?.length || 0,
			en_rango: consultations.length,
		});

		// Ingresos (facturacion) - Obtener TODAS las facturas del doctor para análisis completo
		// Incluir tipo_cambio, metodo_pago y notas (donde se guarda la referencia de pago móvil)
		const { data: allInvoices, error: invoicesError } = await supabase
			.from('facturacion')
			.select('id, total, currency, tipo_cambio, fecha_pago, fecha_emision, estado_pago, created_at, numero_factura, metodo_pago, notas')
			.eq('doctor_id', user.userId);

		if (invoicesError) {
			console.error('[Medic Reportes API] Error obteniendo facturas:', invoicesError);
		} else {
			console.log('[Medic Reportes API] Total facturas del doctor:', allInvoices?.length || 0);
		}

		// Filtrar por rango de fechas en el lado del servidor
		// Usar fecha_pago si existe, sino fecha_emision, sino created_at
		// Comparar solo la fecha (sin hora) para evitar problemas de zona horaria
		const invoices = (allInvoices || []).filter((inv: any) => {
			const fechaRelevante = inv.fecha_pago || inv.fecha_emision || inv.created_at;
			if (!fechaRelevante) return false;
			
			const fecha = new Date(fechaRelevante);
			// Normalizar a UTC para comparar solo fechas
			const fechaUTC = new Date(Date.UTC(
				fecha.getUTCFullYear(),
				fecha.getUTCMonth(),
				fecha.getUTCDate()
			));
			const startUTC = new Date(Date.UTC(
				start.getUTCFullYear(),
				start.getUTCMonth(),
				start.getUTCDate()
			));
			const endUTC = new Date(Date.UTC(
				end.getUTCFullYear(),
				end.getUTCMonth(),
				end.getUTCDate()
			));
			
			const inRange = fechaUTC >= startUTC && fechaUTC <= endUTC;
			
			// Log para depuración
			if (allInvoices && allInvoices.length > 0 && allInvoices.length <= 5) {
				console.log('[Medic Reportes API] Factura:', {
					id: inv.id,
					fecha_pago: inv.fecha_pago,
					fecha_emision: inv.fecha_emision,
					created_at: inv.created_at,
					fecha_usada: fechaRelevante,
					fechaUTC: fechaUTC.toISOString(),
					startUTC: startUTC.toISOString(),
					endUTC: endUTC.toISOString(),
					inRange,
					estado_pago: inv.estado_pago,
					total: inv.total,
				});
			}
			
			return inRange;
		});

		// Separar facturas pagadas para el cálculo de ingresos
		const paidInvoices = invoices.filter((inv: any) => 
			inv.estado_pago === 'pagada' || inv.estado_pago === 'pagado'
		);

		// Log para depuración
		console.log('[Medic Reportes API] Facturas encontradas:', {
			total_facturas_doctor: allInvoices?.length || 0,
			facturas_en_rango: invoices.length,
			facturas_pagadas_en_rango: paidInvoices.length,
			doctor_id: user.userId,
			rango: { start: start.toISOString(), end: end.toISOString() },
			estados: invoices.reduce((acc: any, inv: any) => {
				acc[inv.estado_pago] = (acc[inv.estado_pago] || 0) + 1;
				return acc;
			}, {}),
			ejemplo_facturas: invoices.slice(0, 3).map((inv: any) => ({
				total: inv.total,
				estado: inv.estado_pago,
				fecha_pago: inv.fecha_pago,
				fecha_emision: inv.fecha_emision,
			})),
		});

		// Diagnósticos más comunes - Usar las consultas ya filtradas
		const diagnosisData = consultations.filter((cons: any) => cons.diagnosis != null);

		// Órdenes emitidas - lab_result no tiene campo 'status' según el esquema
		const { data: orders, error: ordersError } = await supabase
			.from('lab_result')
			.select('id, created_at, result_type')
			.eq('ordering_provider_id', user.userId)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString());

		if (ordersError) {
			console.error('[Medic Reportes API] Error obteniendo órdenes:', ordersError);
		} else {
			console.log('[Medic Reportes API] Órdenes encontradas:', orders?.length || 0);
		}

		// Resultados críticos - Obtener todos y filtrar después
		const { data: allCriticalResults, error: criticalError } = await supabase
			.from('lab_result')
			.select('id, reported_at, created_at')
			.eq('is_critical', true);

		if (criticalError) {
			console.error('[Medic Reportes API] Error obteniendo resultados críticos:', criticalError);
		}

		// Filtrar por rango usando reported_at o created_at como fallback
		const criticalResults = (allCriticalResults || []).filter((result: any) => {
			const fecha = result.reported_at || result.created_at;
			if (!fecha) return false;
			const fechaDate = new Date(fecha);
			return fechaDate >= start && fechaDate <= end;
		});

		console.log('[Medic Reportes API] Resultados críticos encontrados:', {
			total: allCriticalResults?.length || 0,
			en_rango: criticalResults.length,
		});

		// Procesar diagnósticos
		interface DiagnosisData {
			diagnosis: string | null;
		}
		const diagnosisCounts: Record<string, number> = {};
		(diagnosisData || []).forEach((c: DiagnosisData) => {
			if (c.diagnosis) {
				diagnosisCounts[c.diagnosis] = (diagnosisCounts[c.diagnosis] || 0) + 1;
			}
		});

		const topDiagnoses = Object.entries(diagnosisCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([diagnosis, count]) => ({ diagnosis, count }));

		// Calcular ingresos - Solo facturas con estado_pago = 'pagada' o 'pagado'
		// Usar la tasa de cambio guardada en cada factura (tipo_cambio) para calcular en bolívares
		interface Invoice {
			estado_pago: string;
			total: number | string | null;
			currency?: string;
			tipo_cambio?: number | null;
		}
		
		console.log('[Medic Reportes API] Facturas pagadas para calcular ingresos:', {
			cantidad: paidInvoices.length,
			detalles: paidInvoices.slice(0, 5).map((inv: any) => ({
				id: inv.id,
				total: inv.total,
				total_type: typeof inv.total,
				currency: inv.currency,
				estado_pago: inv.estado_pago,
				tipo_cambio: inv.tipo_cambio,
			})),
		});
		
		// Calcular ingresos en USD (suma directa)
		// Asegurar que siempre retorne un número, incluso si no hay facturas
		const totalIncomeUSD = paidInvoices.length > 0 
			? paidInvoices.reduce((sum: number, inv: Invoice) => {
				const total = Number(inv.total || 0);
				if (isNaN(total)) {
					console.warn('[Medic Reportes API] Factura con total inválido:', inv);
					return sum;
				}
				console.log('[Medic Reportes API] Sumando factura:', { 
					id: (inv as any).id,
					total, 
					total_original: inv.total,
					currency: inv.currency, 
					suma_parcial: sum + total 
				});
				return sum + total;
			}, 0)
			: 0;

		// Para compatibilidad, mantener totalIncome como USD
		// Asegurar que siempre sea un número
		const totalIncome = Number(totalIncomeUSD) || 0;

		// Obtener tasas históricas de la base de datos de tasas para el desglose y cálculo total
		let historicalRates: any[] = [];
		if (ratesSupabase && paidInvoices.length > 0) {
			try {
				// Guardar referencia en constante local para TypeScript
				const client = ratesSupabase;
				if (!client) {
					throw new Error('Cliente de tasas no disponible');
				}

				// Obtener fechas únicas de las facturas pagadas
				// Prioridad: fecha_pago > fecha_emision > created_at
				const uniqueDates = new Set<string>();
				paidInvoices.forEach((inv: any) => {
					// Usar fecha_pago como prioridad principal
					const fecha = inv.fecha_pago || inv.fecha_emision || inv.created_at;
					if (fecha) {
						const fechaDate = new Date(fecha);
						const dateStr = fechaDate.toISOString().split('T')[0]; // YYYY-MM-DD
						uniqueDates.add(dateStr);
					}
				});

				// Obtener tasas para cada fecha única Y cada moneda única
				// Primero obtener todas las monedas únicas de las facturas
				const uniqueCurrencies = new Set<string>();
				paidInvoices.forEach((inv: any) => {
					const currency = inv.currency || 'USD';
					if (currency !== 'BS' && currency !== 'VES') {
						uniqueCurrencies.add(currency);
					}
				});

				// Obtener tasas para cada combinación de fecha y moneda
				const ratesPromises: Promise<any>[] = [];
				Array.from(uniqueDates).forEach((dateStr) => {
					Array.from(uniqueCurrencies).forEach((currencyCode) => {
						const promise = Promise.resolve(
							client
								.from('rates')
								.select('*')
								.eq('code', currencyCode)
								.eq('curr_date', dateStr)
								.order('rate_datetime', { ascending: false })
								.limit(1)
								.maybeSingle()
						).then(({ data, error }) => {
							if (error) {
								console.error(`[Medic Reportes API] Error obteniendo tasa ${currencyCode} para ${dateStr}:`, error);
								return null;
							}
							return data ? { date: dateStr, currency: currencyCode, rate: Number(data.rate) || 0, ...data } : null;
						});
						ratesPromises.push(promise);
					});
				});

				const ratesResults = await Promise.all(ratesPromises);
				historicalRates = ratesResults.filter((r) => r !== null);
				
				console.log('[Medic Reportes API] Tasas históricas obtenidas:', {
					cantidad: historicalRates.length,
					tasas: historicalRates.map((r) => ({ date: r.date, rate: r.rate })),
				});
			} catch (err) {
				console.error('[Medic Reportes API] Error obteniendo tasas históricas:', err);
			}
		}

		// Recalcular totalIncomeBS usando tasas históricas de la base de datos
		// Si no hay tasa histórica, usar tipo_cambio de la factura
		// Prioridad: fecha_pago > fecha_emision > created_at
		let totalIncomeBSRecalculated = 0;
		if (paidInvoices.length > 0) {
			totalIncomeBSRecalculated = paidInvoices.reduce((sum: number, inv: any) => {
				const total = Number(inv.total || 0);
				if (isNaN(total)) return sum;

				// Usar fecha_pago como prioridad principal
				const fecha = inv.fecha_pago || inv.fecha_emision || inv.created_at;
				let tasa = Number(inv.tipo_cambio || 1); // Fallback a tipo_cambio de la factura

				// Buscar tasa histórica de la base de datos usando la misma fecha Y la moneda de la factura
				const invoiceCurrency = inv.currency || 'USD';
				if (fecha && historicalRates.length > 0 && invoiceCurrency !== 'BS' && invoiceCurrency !== 'VES') {
					const fechaDate = new Date(fecha);
					const dateStr = fechaDate.toISOString().split('T')[0]; // YYYY-MM-DD
					// Buscar tasa para la moneda específica de la factura
					const historicalRate = historicalRates.find((r) => r.date === dateStr && r.currency === invoiceCurrency);
					if (historicalRate && historicalRate.rate > 0) {
						tasa = historicalRate.rate;
					}
				}

				return sum + (total * tasa);
			}, 0);
		}

		// Usar el valor recalculado
		const totalIncomeBS = totalIncomeBSRecalculated;

		// Función auxiliar para extraer referencia de pago móvil de las notas
		const extractPaymentReference = (notas: string | null): string | null => {
			if (!notas) return null;
			// Buscar patrón [REFERENCIA] {numero}
			const match = notas.match(/\[REFERENCIA\]\s*(\S+)/i);
			return match ? match[1] : null;
		};

		// Crear desglose de ingresos por fecha
		// Prioridad: fecha_pago > fecha_emision > created_at
		const incomeBreakdown: Record<string, { 
			usd: number; 
			bs: number; 
			count: number; 
			tasa: number;
			currency: string;
			metodos: Array<{ metodo: string; referencia: string | null; count: number }>;
		}> = {};
		
		paidInvoices.forEach((inv: any) => {
			// Usar fecha_pago como prioridad principal
			const fecha = inv.fecha_pago || inv.fecha_emision || inv.created_at;
			if (!fecha) {
				console.warn('[Medic Reportes API] Factura sin fecha:', inv.id);
				return;
			}

			// Extraer la fecha en formato YYYY-MM-DD sin problemas de zona horaria
			// Si fecha_pago es un string ISO, extraer directamente la parte de la fecha
			let dateStr: string;
			if (typeof fecha === 'string' && fecha.includes('T')) {
				// Es un string ISO, extraer la parte de la fecha antes de la T
				dateStr = fecha.split('T')[0];
			} else {
				// Es una fecha, convertir usando UTC para evitar problemas de zona horaria
				const fechaDate = new Date(fecha);
				// Usar UTC para obtener la fecha correcta sin importar la zona horaria
				const year = fechaDate.getUTCFullYear();
				const month = String(fechaDate.getUTCMonth() + 1).padStart(2, '0');
				const day = String(fechaDate.getUTCDate()).padStart(2, '0');
				dateStr = `${year}-${month}-${day}`;
			}

			// Log para depuración - siempre loguear para ver qué está pasando
			console.log('[Medic Reportes API] Procesando factura para desglose:', {
				id: inv.id,
				fecha_pago: inv.fecha_pago,
				fecha_pago_type: typeof inv.fecha_pago,
				fecha_emision: inv.fecha_emision,
				created_at: inv.created_at,
				fecha_usada: fecha,
				fecha_usada_type: typeof fecha,
				dateStr,
				total: inv.total,
				metodo_pago: inv.metodo_pago,
				notas: inv.notas,
			});
			
			const total = Number(inv.total || 0);
			let tasa = Number(inv.tipo_cambio || 1);
			const metodoPago = inv.metodo_pago || 'NO_ESPECIFICADO';
			const referencia = extractPaymentReference(inv.notas);
			const invoiceCurrency = inv.currency || 'USD';

			// Buscar tasa histórica para la moneda específica de esta factura
			if (invoiceCurrency !== 'BS' && invoiceCurrency !== 'VES' && historicalRates.length > 0) {
				const historicalRate = historicalRates.find((r) => r.date === dateStr && r.currency === invoiceCurrency);
				if (historicalRate && historicalRate.rate > 0) {
					tasa = historicalRate.rate;
				}
			}

			// Crear clave única por fecha y moneda para el desglose
			const breakdownKey = `${dateStr}_${invoiceCurrency}`;

			if (!incomeBreakdown[breakdownKey]) {
				incomeBreakdown[breakdownKey] = {
					usd: 0,
					bs: 0,
					count: 0,
					tasa: tasa,
					metodos: [],
					currency: invoiceCurrency,
				};
			}

			incomeBreakdown[breakdownKey].usd += total;
			incomeBreakdown[breakdownKey].bs += total * tasa;
			incomeBreakdown[breakdownKey].count += 1;

			// Agregar o actualizar método de pago
			const metodoExistente = incomeBreakdown[breakdownKey].metodos.find((m) => m.metodo === metodoPago && m.referencia === referencia);
			if (metodoExistente) {
				metodoExistente.count += 1;
			} else {
				incomeBreakdown[breakdownKey].metodos.push({
					metodo: metodoPago,
					referencia: referencia,
					count: 1,
				});
			}
		});

		// Convertir a array y ordenar por fecha
		// La clave ahora es "fecha_moneda", necesitamos extraer la fecha
		const incomeBreakdownArray = Object.entries(incomeBreakdown)
			.map(([key, data]) => {
				// Extraer la fecha del breakdownKey (formato: "YYYY-MM-DD_CURRENCY")
				const dateStr = key.split('_')[0];
				return {
					...data,
					date: dateStr,
					currency: data.currency || 'USD',
				};
			})
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		console.log('[Medic Reportes API] Ingresos calculados:', {
			totalIncome,
			totalIncomeUSD,
			totalIncomeBS,
			facturas_pagadas: paidInvoices.length,
			facturas_totales_en_rango: invoices.length,
			desglose_dias: incomeBreakdownArray.length,
			ejemplo_tasas: paidInvoices.slice(0, 3).map((inv: Invoice) => ({
				total: inv.total,
				currency: inv.currency,
				tipo_cambio: inv.tipo_cambio,
				total_bs: Number(inv.total || 0) * Number(inv.tipo_cambio || 1),
			})),
		});

		// Agrupar por mes - Usar scheduled_at o created_at como fallback
		interface Appointment {
			scheduled_at: string | null;
			created_at: string;
		}
		const appointmentsByMonth: Record<string, number> = {};
		(appointments || []).forEach((apt: Appointment) => {
			const fecha = apt.scheduled_at || apt.created_at;
			if (fecha) {
				const month = new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
				appointmentsByMonth[month] = (appointmentsByMonth[month] || 0) + 1;
			}
		});

		interface Consultation {
			started_at: string | null;
			created_at: string;
		}
		const consultationsByMonth: Record<string, number> = {};
		(consultations || []).forEach((cons: Consultation) => {
			const fecha = cons.started_at || cons.created_at;
			if (fecha) {
				const month = new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
				consultationsByMonth[month] = (consultationsByMonth[month] || 0) + 1;
			}
		});

		// Asegurar que todos los valores numéricos sean números válidos
		const response = {
			appointmentsByMonth: Object.entries(appointmentsByMonth).map(([month, count]) => ({
				month,
				count,
			})),
			consultationsByMonth: Object.entries(consultationsByMonth).map(([month, count]) => ({
				month,
				count,
			})),
			totalIncome: Number(totalIncome) || 0, // En USD (para compatibilidad)
			totalIncomeUSD: Number(totalIncomeUSD) || 0, // En USD
			totalIncomeBS: Number(totalIncomeBS) || 0, // En Bolívares usando tasas históricas guardadas
			incomeBreakdown: incomeBreakdownArray, // Desglose de ingresos por fecha
			topDiagnoses,
			totalOrders: (orders || []).length,
			totalCriticalResults: (criticalResults || []).length,
			stats: {
				totalAppointments: (appointments || []).length,
				totalConsultations: (consultations || []).length,
				totalInvoices: (invoices || []).length,
				paidInvoices: paidInvoices.length, // Facturas pagadas en el rango
			},
		};

		console.log('[Medic Reportes API] Respuesta final:', {
			totalIncome: response.totalIncome,
			totalIncomeUSD: response.totalIncomeUSD,
			totalIncomeBS: response.totalIncomeBS,
			paidInvoices: response.stats.paidInvoices,
			totalInvoices: response.stats.totalInvoices,
			tipos: {
				totalIncome: typeof response.totalIncome,
				totalIncomeUSD: typeof response.totalIncomeUSD,
				totalIncomeBS: typeof response.totalIncomeBS,
			},
		});

		return NextResponse.json(response, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Reportes API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

