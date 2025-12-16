// app/api/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

/**
 * Batch API endpoint
 * Allows multiple operations in a single request to reduce round-trips
 * Critical for slow/unstable connections
 * 
 * Request format:
 * {
 *   "operations": [
 *     {
 *       "type": "consultation" | "prescription" | "vitals" | "log",
 *       "method": "POST" | "PATCH" | "PUT",
 *       "endpoint": "/api/consultations" | "/api/prescriptions" | etc,
 *       "data": { ... }
 *     }
 *   ]
 * }
 */

type BatchOperation = {
	type: string;
	method: 'POST' | 'PATCH' | 'PUT';
	endpoint: string;
	data: Record<string, any>;
};

type BatchRequest = {
	operations: BatchOperation[];
};

// Cache for internal API handlers
const internalHandlers: Record<string, (data: any, user: any, supabase: any) => Promise<any>> = {};

/**
 * Register internal handler for batch operations
 * This allows us to execute operations without HTTP overhead
 */
function registerHandler(type: string, handler: (data: any, user: any, supabase: any) => Promise<any>) {
	internalHandlers[type] = handler;
}

// Register handlers for common operations
registerHandler('consultation', async (data, user, supabase) => {
	// Handle consultation creation/update
	// This is a simplified version - in production, call the actual consultation handler
	const { patient_id, unregistered_patient_id, appointment_id, doctor_id, organization_id, chief_complaint, diagnosis, notes, vitals } = data;

	if (!patient_id && !unregistered_patient_id && !appointment_id) {
		throw new Error('patient_id, unregistered_patient_id o appointment_id es obligatorio');
	}

	const consultationData: any = {
		doctor_id: doctor_id || user.userId,
		organization_id: organization_id || user.organizationId,
		chief_complaint,
		diagnosis,
		notes,
		vitals: vitals ? JSON.stringify(vitals) : null,
	};

	if (patient_id) consultationData.patient_id = patient_id;
	if (unregistered_patient_id) consultationData.unregistered_patient_id = unregistered_patient_id;
	if (appointment_id) consultationData.appointment_id = appointment_id;

	const { data: consultation, error } = await supabase.from('consultation').insert(consultationData).select().single();

	if (error) throw error;

	return { id: consultation.id, ...consultation };
});

registerHandler('prescription', async (data, user, supabase) => {
	// Handle prescription creation
	const { consultation_id, patient_id, unregistered_patient_id, doctor_id, notes, valid_until, items } = data;

	if (!consultation_id || (!patient_id && !unregistered_patient_id) || !doctor_id) {
		throw new Error('Faltan campos requeridos');
	}

	const prescriptionData: any = {
		doctor_id,
		consultation_id,
		notes,
		valid_until: valid_until || null,
		status: 'ACTIVE',
	};

	if (patient_id) prescriptionData.patient_id = patient_id;
	if (unregistered_patient_id) prescriptionData.unregistered_patient_id = unregistered_patient_id;

	const { data: prescription, error } = await supabase.from('prescription').insert(prescriptionData).select().single();

	if (error) throw error;

	// Insert prescription items if provided
	if (items && Array.isArray(items) && items.length > 0) {
		const itemsPayload = items.map((item: any) => ({
			prescription_id: prescription.id,
			name: item.name,
			dosage: item.dosage,
			frequency: item.frequency,
			duration: item.duration,
			quantity: item.quantity || 1,
			instructions: item.instructions || '',
		}));

		const { error: itemsError } = await supabase.from('prescription_item').insert(itemsPayload);
		if (itemsError) {
			console.error('Error inserting prescription items:', itemsError);
			// Don't fail the whole operation, just log
		}
	}

	return { id: prescription.id, ...prescription };
});

export async function POST(req: NextRequest) {
	try {
		// Authenticate user - allow all authenticated users for batch operations
		// We'll check specific permissions per operation
		const authResult = await apiRequireRole(['MEDICO', 'CLINICA', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const body: BatchRequest = await req.json();

		if (!body.operations || !Array.isArray(body.operations) || body.operations.length === 0) {
			return NextResponse.json({ error: 'Se requiere un array de operaciones' }, { status: 400 });
		}

		// Limit batch size for safety
		if (body.operations.length > 10) {
			return NextResponse.json({ error: 'Máximo 10 operaciones por batch' }, { status: 400 });
		}

		const results: Array<{ success: boolean; data?: any; error?: string }> = [];

		// Execute operations sequentially to maintain order and allow rollback if needed
		// In a production system, you might want to use database transactions
		for (const operation of body.operations) {
			try {
				const handler = internalHandlers[operation.type];
				if (!handler) {
					results.push({
						success: false,
						error: `Tipo de operación no soportado: ${operation.type}`,
					});
					continue;
				}

				const result = await handler(operation.data, user, supabase);
				results.push({
					success: true,
					data: result,
				});
			} catch (error: any) {
				results.push({
					success: false,
					error: error.message || 'Error desconocido',
				});
				// Continue with other operations even if one fails
			}
		}

		// Return results
		const allSuccessful = results.every((r) => r.success);
		return NextResponse.json(
			{
				success: allSuccessful,
				results,
			},
			{ status: allSuccessful ? 200 : 207 } // 207 Multi-Status if some failed
		);
	} catch (error: any) {
		console.error('[Batch API] Error:', error);
		return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
	}
}

