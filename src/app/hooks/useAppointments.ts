'use client';

import useSWR from 'swr';
import { useLiteMode } from '@/contexts/LiteModeContext';
import { getLiteCacheConfig } from '@/lib/lite-mode-utils';

type Appointment = {
	id: string;
	patient: string;
	patientFirstName?: string | null;
	patientLastName?: string | null;
	patientIdentifier?: string | null;
	patientPhone?: string | null;
	reason: string;
	time: string;
	scheduled_at?: string;
	status: 'CONFIRMADA' | 'EN_ESPERA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA' | 'SCHEDULED' | 'REAGENDADA' | 'NO ASISTIÓ' | 'NO_ASISTIO';
	location?: string;
	isUnregistered?: boolean;
	selected_service?: {
		name: string;
		description?: string;
		price?: number;
		currency?: string;
	} | null;
	referral_source?: string | null;
	bookedBy?: {
		id: string;
		name: string;
		identifier?: string | null;
	} | null;
};

const fetcher = async (url: string) => {
	const res = await fetch(url);
	const data = await res.json();

	// Si hay un error en la respuesta, lanzar error
	if (!res.ok) {
		throw new Error(data.error || 'Error al obtener citas');
	}

	// Asegurar que siempre devolvemos un array
	return Array.isArray(data) ? data : [];
};

export function useAppointments(selectedDate?: Date) {
	const dateParam = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
	const { isLiteMode } = useLiteMode();
	
	const url = `/api/dashboard/medic/appointments?date=${dateParam}${isLiteMode ? '&liteMode=true' : ''}`;
	const { data, error, mutate, isLoading } = useSWR<Appointment[]>(url, fetcher, {
		revalidateOnFocus: !isLiteMode, // No revalidar en focus si es liteMode
		revalidateOnReconnect: true,
		dedupingInterval: isLiteMode ? 60000 : 30000, // Más tiempo entre deduplicaciones en liteMode
	});

	// Crear nueva cita
	const createAppointment = async (payload: any) => {
		const res = await fetch('/api/dashboard/medic/appointments/new', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data.error || 'Error al crear cita');
		mutate(); // Refresca la lista
		return data;
	};

	// Actualizar cita existente
	const updateAppointment = async (id: string, updates: any) => {
		console.log('🔄 [useAppointments] Updating appointment:', { id, updates });
		
		try {
			// Actualización optimista: actualizar UI inmediatamente
			mutate(
				(currentData: Appointment[] | undefined) => {
					if (!currentData) return currentData;
					return currentData.map((apt) => 
						apt.id === id ? { ...apt, ...updates } : apt
					);
				},
				false // No revalidar todavía
			);

			const res = await fetch(`/api/dashboard/medic/appointments/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});
			
			console.log('📡 [useAppointments] Response status:', res.status);
			
			const responseData = await res.json();
			console.log('📦 [useAppointments] Response data:', responseData);
			
			if (!res.ok) {
				console.error('❌ [useAppointments] Update failed:', responseData.error);
				// Revertir cambio optimista
				mutate();
				throw new Error(responseData.error || 'Error al actualizar cita');
			}
			
			// Actualizar con datos reales del servidor
			if (responseData.appointment) {
				console.log('✅ [useAppointments] Updating cache with server data:', responseData.appointment);
				mutate(
					(currentData: Appointment[] | undefined) => {
						if (!currentData) return currentData;
						return currentData.map((apt) => 
							apt.id === id ? { ...apt, ...responseData.appointment } : apt
						);
					},
					false // No revalidar, ya tenemos los datos frescos
				);
			} else {
				console.log('⚠️ [useAppointments] No appointment in response, revalidating');
				// Si no hay datos retornados, revalidar para obtener datos frescos
				await mutate();
			}
			
			console.log('✅ [useAppointments] Update completed successfully');
			return responseData;
		} catch (error) {
			console.error('❌ [useAppointments] Update error:', error);
			throw error;
		}
	};

	return {
		appointments: Array.isArray(data) ? data : [],
		isLoading,
		isError: error,
		createAppointment,
		updateAppointment,
		refetch: mutate,
	};
}
