'use client';

import useSWR from 'swr';

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) {
		const error = await res.json();
		throw new Error(error.error || 'Error fetching indicators');
	}
	return res.json();
};

export function useAppointmentIndicators(month: number, year: number) {
	const { data, error, isLoading, mutate } = useSWR(
		`/api/appointments/indicators?month=${month}&year=${year}`,
		fetcher,
		{
			revalidateOnFocus: false,
			dedupingInterval: 60000, // 1 minuto de cache
		}
	);

	// Convertir el array de strings ["2024-02-19"] a un Set de objetos Date
	// para búsqueda rápida O(1)
	const appointmentDates = data?.dates ? new Set(data.dates) : new Set();

	return {
		appointmentDates,
		isLoading,
		isError: error,
		refetch: mutate
	};
}
