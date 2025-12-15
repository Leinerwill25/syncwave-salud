import { useState, useEffect } from 'react';

type Appointment = {
	id: string;
	patient: string;
	patientFirstName?: string | null;
	patientLastName?: string | null;
	patientIdentifier?: string | null;
	patientPhone?: string | null;
	patientEmail?: string | null;
	reason: string;
	time: string;
	scheduled_at?: string;
	status: 'CONFIRMADA' | 'EN_ESPERA' | 'COMPLETADA' | 'CANCELADA' | 'SCHEDULED' | 'REAGENDADA' | 'NO ASISTIÓ' | 'NO_ASISTIO';
	location?: string;
	isUnregistered?: boolean;
	bookedBy?: {
		id: string;
		name: string;
		identifier?: string | null;
	} | null;
	selected_service?: {
		name: string;
		description?: string;
		price: string;
		currency: string;
	} | null;
	referral_source?: string | null;
};

export function useAppointmentsForRoleUser(selectedDate?: Date) {
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isError, setIsError] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const dateParam = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

	useEffect(() => {
		const fetchAppointments = async () => {
			setIsLoading(true);
			setIsError(false);
			setError(null);

			try {
				const res = await fetch(`/api/role-users/appointments-by-date?date=${dateParam}`, {
					credentials: 'include',
				});

				if (!res.ok) {
					const errorData = await res.json();
					throw new Error(errorData.error || 'Error al obtener citas');
				}

				const data = await res.json();
				setAppointments(Array.isArray(data) ? data : []);
			} catch (err: any) {
				console.error('[useAppointmentsForRoleUser] Error:', err);
				setIsError(true);
				setError(err.message || 'Error al cargar citas');
				setAppointments([]);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAppointments();
	}, [dateParam]);

	// Actualizar cita existente
	const updateAppointment = async (id: string, updates: any) => {
		try {
			const res = await fetch(`/api/role-users/appointments/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(updates),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Error al actualizar cita');

			// Recargar la lista completa para obtener datos actualizados usando mutate
			await mutate();

			return data;
		} catch (err: any) {
			console.error('[useAppointmentsForRoleUser] Error actualizando cita:', err);
			throw err;
		}
	};

	// Mutar (forzar recarga)
	const mutate = async () => {
		const res = await fetch(`/api/role-users/appointments-by-date?date=${dateParam}`, {
			credentials: 'include',
		});

		if (!res.ok) {
			const errorData = await res.json();
			throw new Error(errorData.error || 'Error al obtener citas');
		}

		const data = await res.json();
		setAppointments(Array.isArray(data) ? data : []);
	};

	return {
		appointments,
		isLoading,
		isError,
		error,
		updateAppointment,
		mutate,
	};
}
