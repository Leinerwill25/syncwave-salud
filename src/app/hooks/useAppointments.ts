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
		const res = await fetch(`/api/dashboard/medic/appointments/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updates),
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data.error || 'Error al actualizar cita');
		mutate(); // Refresca la lista
		return data;
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
