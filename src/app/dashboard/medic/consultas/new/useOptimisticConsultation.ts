'use client';

import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';
import { useRouter } from 'next/navigation';
import { batchOperations } from '@/lib/api-helpers';

/**
 * Hook for optimistic consultation creation
 * Provides instant UI feedback while saving in background
 */
export function useOptimisticConsultation() {
	const router = useRouter();

	const mutation = useOptimisticMutation(
		async (payload: {
			patientType: 'registered' | 'unregistered';
			patientId?: string;
			unregisteredPatientId?: string;
			unregisteredData?: any;
			doctorId: string;
			organizationId: string;
			chiefComplaint: string;
			diagnosis?: string;
			notes?: string;
			vitals?: any;
			appointmentId?: string;
			selectedServices?: string[];
			services?: Array<{ id: string; price: number; currency: string }>;
			consultationDate?: string;
		}) => {
			// Build operations array for batch API
			const operations: Array<{ type: string; method: string; endpoint: string; data: any }> = [];

			// 1. Create unregistered patient if needed
			let finalUnregisteredPatientId = payload.unregisteredPatientId;
			if (payload.patientType === 'unregistered' && !finalUnregisteredPatientId && payload.unregisteredData) {
				// This would be handled separately, but for batch we can include it
				// For now, we'll create patient first if needed
				const patientRes = await fetch('/api/unregistered-patients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload.unregisteredData),
				});

				if (!patientRes.ok) {
					const error = await patientRes.json();
					throw new Error(error.error || 'Error al crear paciente');
				}

				const patientData = await patientRes.json();
				finalUnregisteredPatientId = patientData.id || patientData.data?.id;
			}

			// 2. Create consultation
			const consultationPayload: any = {
				doctor_id: payload.doctorId,
				organization_id: payload.organizationId,
				chief_complaint: payload.chiefComplaint,
				diagnosis: payload.diagnosis || null,
				notes: payload.notes || null,
				vitals: payload.vitals || null,
			};

			if (payload.patientType === 'registered') {
				consultationPayload.patient_id = payload.patientId;
			} else {
				consultationPayload.unregistered_patient_id = finalUnregisteredPatientId;
			}

			if (payload.appointmentId) {
				consultationPayload.appointment_id = payload.appointmentId;
			}

			operations.push({
				type: 'consultation',
				method: 'POST',
				endpoint: '/api/consultations',
				data: consultationPayload,
			});

			// 3. Create billing if services selected
			if (payload.selectedServices && payload.selectedServices.length > 0 && payload.services) {
				const selectedServicesData = payload.services.filter((s) => payload.selectedServices!.includes(s.id));
				const subtotal = selectedServicesData.reduce((sum, s) => sum + Number(s.price), 0);
				const total = subtotal;
				const currency = selectedServicesData[0]?.currency || 'USD';

				operations.push({
					type: 'billing',
					method: 'POST',
					endpoint: '/api/facturacion',
					data: {
						consultation_id: '{{consultation_id}}', // Will be replaced after consultation is created
						patient_id: payload.patientType === 'registered' ? payload.patientId : null,
						unregistered_patient_id: payload.patientType === 'unregistered' ? finalUnregisteredPatientId : null,
						doctor_id: payload.doctorId,
						organization_id: payload.organizationId,
						subtotal: subtotal,
						impuestos: 0,
						total: total,
						currency: currency,
						estado_pago: 'pendiente',
					},
				});
			}

			// Execute batch operations
			if (operations.length === 1) {
				// Single operation, use direct API call for simplicity
				const res = await fetch('/api/consultations', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(consultationPayload),
				});

				if (!res.ok) {
					const error = await res.json();
					throw new Error(error.error || 'Error al crear consulta');
				}

				const data = await res.json();
				const consultationId = data?.data?.id || data?.id;

				// Create billing separately if needed
				if (payload.selectedServices && payload.selectedServices.length > 0 && payload.services) {
					const selectedServicesData = payload.services.filter((s) => payload.selectedServices!.includes(s.id));
					const subtotal = selectedServicesData.reduce((sum, s) => sum + Number(s.price), 0);
					const total = subtotal;
					const currency = selectedServicesData[0]?.currency || 'USD';

					await fetch('/api/facturacion', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify({
							consultation_id: consultationId,
							patient_id: payload.patientType === 'registered' ? payload.patientId : null,
							unregistered_patient_id: payload.patientType === 'unregistered' ? finalUnregisteredPatientId : null,
							doctor_id: payload.doctorId,
							organization_id: payload.organizationId,
							subtotal: subtotal,
							impuestos: 0,
							total: total,
							currency: currency,
							estado_pago: 'pendiente',
						}),
					}).catch((err) => {
						console.warn('Error creating billing (non-blocking):', err);
					});
				}

				return { id: consultationId };
			} else {
				// Multiple operations, use batch API
				const result = await batchOperations(operations);
				const consultationResult = result.results[0];
				if (!consultationResult.success) {
					throw new Error(consultationResult.error || 'Error al crear consulta');
				}
				return { id: consultationResult.data.id };
			}
		},
		{
			invalidateQueries: [['consultations'], ['patients']],
			successMessage: 'Consulta guardada exitosamente',
			errorMessage: 'Error al guardar consulta. Reintentando...',
			critical: true,
			silent: false,
		}
	);

	// Wrapper para manejar navegación después del éxito
	const mutateWithNavigation = (variables: Parameters<typeof mutation.mutate>[0], options?: Parameters<typeof mutation.mutate>[1]) => {
		mutation.mutate(variables, {
			...options,
			onSuccess: (data, variables, context, mutation) => {
				// Navigate to consultation page immediately (optimistic navigation)
				if (data?.id) {
					router.push(`/dashboard/medic/consultas/${data.id}`);
				}
				// Call original onSuccess if provided
				if (options?.onSuccess) {
					options.onSuccess(data, variables, context, mutation);
				}
			},
		});
	};

	return {
		...mutation,
		mutate: mutateWithNavigation,
	};
}
