'use client';

import useSWR from 'swr';

type Appointment = {
	id: string;
	patient: string;
	reason: string;
	time: string;
	status: 'CONFIRMADA' | 'EN_ESPERA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA' | 'SCHEDULED';
	location?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAppointments(selectedDate?: Date) {
	const dateParam = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

	const { data, error, mutate, isLoading } = useSWR<Appointment[]>(`/api/dashboard/medic/appointments?date=${dateParam}`, fetcher);

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
		appointments: data || [],
		isLoading,
		isError: error,
		createAppointment,
		updateAppointment,
		refetch: mutate,
	};
}
