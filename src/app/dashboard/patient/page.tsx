'use client';

import { useState, useEffect } from 'react';
import { Calendar, FileText, Pill, FlaskConical, Search, MapPin, Clock, Stethoscope, Building2, ShoppingBag, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

type Appointment = {
	id: string;
	scheduled_at: string;
	status: string;
	reason: string | null;
	doctor: {
		name: string | null;
	} | null;
	organization: {
		name: string | null;
	} | null;
};

type QuickStats = {
	upcomingAppointments: number;
	activePrescriptions: number;
	pendingResults: number;
	unreadMessages: number;
};

export default function PatientDashboardPage() {
	const [loading, setLoading] = useState(true);
	const [patientName, setPatientName] = useState<string>('');
	const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
	const [stats, setStats] = useState<QuickStats>({
		upcomingAppointments: 0,
		activePrescriptions: 0,
		pendingResults: 0,
		unreadMessages: 0,
	});

	// Filtros de búsqueda
	const [searchQuery, setSearchQuery] = useState('');
	const [orgType, setOrgType] = useState<string>('');
	const [specialty, setSpecialty] = useState<string>('');
	const [examType, setExamType] = useState<string>('');
	const [budget, setBudget] = useState<string>('');

	useEffect(() => {
		loadDashboardData();
	}, []);

	const loadDashboardData = async () => {
		try {
			setLoading(true);

			// Obtener datos del paciente
			const patientRes = await fetch('/api/patient/profile', { credentials: 'include' });
			if (patientRes.ok) {
				const patientData = await patientRes.json();
				setPatientName(patientData.name || 'Paciente');
			}

			// Obtener próxima cita
			const appointmentsRes = await fetch('/api/patient/appointments?status=upcoming&limit=1', {
				credentials: 'include',
			});
			if (appointmentsRes.ok) {
				const appointmentsData = await appointmentsRes.json();
				if (appointmentsData.data && appointmentsData.data.length > 0) {
					setNextAppointment(appointmentsData.data[0]);
				}
			}

			// Obtener estadísticas
			const [prescriptionsRes, resultsRes, messagesRes] = await Promise.all([fetch('/api/patient/recetas?status=active', { credentials: 'include' }), fetch('/api/patient/resultados', { credentials: 'include' }), fetch('/api/patient/messages', { credentials: 'include' })]);

			if (prescriptionsRes.ok) {
				const prescData = await prescriptionsRes.json();
				setStats((prev) => ({ ...prev, activePrescriptions: prescData.data?.length || 0 }));
			}

			if (resultsRes.ok) {
				const resultsData = await resultsRes.json();
				setStats((prev) => ({ ...prev, pendingResults: resultsData.data?.length || 0 }));
			}

			if (messagesRes.ok) {
				const messagesData = await messagesRes.json();
				const unread = (messagesData.messages || []).filter((m: any) => !m.read).length;
				setStats((prev) => ({ ...prev, unreadMessages: unread }));
			}

			const appointmentsCountRes = await fetch('/api/patient/appointments?status=upcoming', {
				credentials: 'include',
			});
			if (appointmentsCountRes.ok) {
				const appointmentsCountData = await appointmentsCountRes.json();
				setStats((prev) => ({ ...prev, upcomingAppointments: appointmentsCountData.data?.length || 0 }));
			}
		} catch (err) {
			console.error('Error cargando dashboard:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = () => {
		const params = new URLSearchParams();
		if (searchQuery) params.set('query', searchQuery);
		if (orgType) params.set('type', orgType);
		if (specialty) params.set('specialty', specialty);
		if (examType) params.set('exam', examType);
		if (budget) params.set('budget_min', budget);

		window.location.href = `/dashboard/patient/explore?${params.toString()}`;
	};

	if (loading) {
		return (
			<div className="space-y-4 sm:space-y-6">
				<div className="animate-pulse space-y-4 sm:space-y-6">
					<div className="h-6 sm:h-8 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
					<div className="h-48 sm:h-64 bg-gray-200 rounded-xl sm:rounded-2xl"></div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="h-32 sm:h-40 bg-gray-200 rounded-xl"></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3 sm:space-y-4 md:space-y-6">
			{/* Header */}
			<div className="bg-white/90 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-5 md:p-6 lg:p-8">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
					<div className="flex-1 min-w-0 w-full">
						<h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1 sm:mb-2 break-words leading-tight">Bienvenido, {patientName}</h1>
						<p className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg">Gestiona tu salud de manera fácil y rápida</p>
					</div>
					<div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-gray-500 whitespace-nowrap">
						<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
						<span className="hidden md:inline">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
						<span className="md:hidden">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
					</div>
				</div>
			</div>

			{/* Próxima cita */}
			{nextAppointment && (
				<div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6 lg:p-8 text-white">
					<div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 bg-white/10 rounded-full -mr-12 sm:-mr-16 md:-mr-24 lg:-mr-32 -mt-12 sm:-mt-16 md:-mt-24 lg:-mt-32 blur-3xl"></div>
					<div className="absolute bottom-0 left-0 w-20 h-20 sm:w-24 sm:h-24 md:w-36 md:h-36 lg:w-48 lg:h-48 bg-white/10 rounded-full -ml-10 sm:-ml-12 md:-ml-18 lg:-ml-24 -mb-10 sm:-mb-12 md:-mb-18 lg:-mb-24 blur-3xl"></div>
					<div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-5 md:gap-6">
						<div className="flex-1 min-w-0 w-full">
							<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
								<div className="p-2 sm:p-2.5 md:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm flex-shrink-0">
									<Calendar className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
								</div>
								<h2 className="text-lg sm:text-xl md:text-2xl font-bold">Próxima Cita</h2>
							</div>
							<div className="space-y-1.5 sm:space-y-2">
								<p className="text-sm sm:text-base md:text-lg font-semibold text-white/90 break-words leading-tight">
									<span className="hidden sm:inline">
										{new Date(nextAppointment.scheduled_at).toLocaleDateString('es-ES', {
											weekday: 'long',
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										})}
									</span>
									<span className="sm:hidden">
										{new Date(nextAppointment.scheduled_at).toLocaleDateString('es-ES', {
											day: 'numeric',
											month: 'short',
											year: 'numeric',
										})}
									</span>
								</p>
								<p className="text-white/80 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
									<Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
									{new Date(nextAppointment.scheduled_at).toLocaleTimeString('es-ES', {
										hour: '2-digit',
										minute: '2-digit',
									})}
								</p>
								<div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
									<Stethoscope className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white/80 flex-shrink-0" />
									<p className="text-white/90 text-xs sm:text-sm md:text-base break-words">Dr. {nextAppointment.doctor?.name || 'Médico'}</p>
								</div>
								{nextAppointment.organization?.name && (
									<div className="flex items-center gap-1.5 sm:gap-2">
										<Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white/80 flex-shrink-0" />
										<p className="text-white/80 text-xs sm:text-sm md:text-base break-words">{nextAppointment.organization.name}</p>
									</div>
								)}
								{nextAppointment.reason && <p className="text-white/70 mt-2 text-[10px] sm:text-xs md:text-sm bg-white/10 rounded-lg p-2 sm:p-2.5 inline-block break-words">Motivo: {nextAppointment.reason}</p>}
							</div>
						</div>
						<Link href="/dashboard/patient/citas" className="w-full md:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white text-indigo-600 rounded-lg sm:rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-center text-xs sm:text-sm md:text-base whitespace-nowrap">
							Ver Todas las Citas
						</Link>
					</div>
				</div>
			)}

			{/* Cards de Acción Rápida */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
				<Link href="/dashboard/patient/citas" className="group bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 sm:p-4 md:p-6 hover:shadow-2xl transition-all border border-white/20 hover:border-indigo-200 hover:-translate-y-1">
					<div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
						<div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform shadow-lg">
							<Calendar className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
						</div>
						{stats.upcomingAppointments > 0 && <span className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-blue-600 text-white text-[9px] sm:text-[10px] md:text-xs font-bold rounded-full shadow-md">{stats.upcomingAppointments}</span>}
					</div>
					<h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 group-hover:text-blue-600 transition-colors">Ver Citas</h3>
					<p className="text-[10px] sm:text-xs md:text-sm text-gray-600">Gestiona tus citas médicas</p>
				</Link>

				<Link href="/dashboard/patient/historial" className="group bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 sm:p-4 md:p-6 hover:shadow-2xl transition-all border border-white/20 hover:border-green-200 hover:-translate-y-1">
					<div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
						<div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform shadow-lg">
							<FileText className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
						</div>
					</div>
					<h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 group-hover:text-green-600 transition-colors">Ver Historial</h3>
					<p className="text-[10px] sm:text-xs md:text-sm text-gray-600">Consulta tu historial médico</p>
				</Link>

				<Link href="/dashboard/patient/recetas" className="group bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 sm:p-4 md:p-6 hover:shadow-2xl transition-all border border-white/20 hover:border-purple-200 hover:-translate-y-1">
					<div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
						<div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform shadow-lg">
							<Pill className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
						</div>
						{stats.activePrescriptions > 0 && <span className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-purple-600 text-white text-[9px] sm:text-[10px] md:text-xs font-bold rounded-full shadow-md">{stats.activePrescriptions}</span>}
					</div>
					<h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 group-hover:text-purple-600 transition-colors">Ver Recetas</h3>
					<p className="text-[10px] sm:text-xs md:text-sm text-gray-600">Tus recetas médicas activas</p>
				</Link>

				<div className="group bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 sm:p-4 md:p-6 border border-white/20 relative overflow-hidden cursor-not-allowed opacity-75">
					<div className="absolute top-1.5 sm:top-2 md:top-3 right-1.5 sm:right-2 md:right-3">
						<span className="px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 bg-yellow-100 text-yellow-700 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold flex items-center gap-0.5 sm:gap-1">
							<Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
							<span className="hidden sm:inline">Próximamente</span>
							<span className="sm:hidden">Próx.</span>
						</span>
					</div>
					<div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
						<div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg sm:rounded-xl shadow-lg opacity-60">
							<FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
						</div>
					</div>
					<h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Ver Resultados</h3>
					<p className="text-[10px] sm:text-xs md:text-sm text-gray-600">Resultados de laboratorio - Próximamente</p>
				</div>
			</div>

			{/* Secciones destacadas */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
				{/* Clínicas destacadas */}
				<div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-5 md:p-6 lg:p-8 relative overflow-hidden">
					<div className="absolute top-1.5 sm:top-2 md:top-4 right-1.5 sm:right-2 md:right-4">
						<span className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-indigo-100 text-indigo-700 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold flex items-center gap-0.5 sm:gap-1">
							<Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
							<span className="hidden sm:inline">Próximamente</span>
							<span className="sm:hidden">Próx.</span>
						</span>
					</div>
					<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
						<div className="p-1.5 sm:p-2 md:p-3 bg-indigo-100 rounded-lg sm:rounded-xl opacity-60 flex-shrink-0">
							<Building2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-indigo-600" />
						</div>
						<h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Clínicas Destacadas</h2>
					</div>
					<p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-4 md:mb-6 leading-relaxed">Estamos trabajando en integrar las mejores clínicas disponibles para ti con especialistas certificados. Esta funcionalidad estará disponible próximamente.</p>
					<div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 bg-gray-200 text-gray-500 rounded-lg sm:rounded-xl font-semibold cursor-not-allowed opacity-60 text-xs sm:text-sm md:text-base">
						<Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
						Próximamente
					</div>
				</div>

				{/* Laboratorios */}
				<div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-5 md:p-6 lg:p-8 relative overflow-hidden">
					<div className="absolute top-1.5 sm:top-2 md:top-4 right-1.5 sm:right-2 md:right-4">
						<span className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-yellow-100 text-yellow-700 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold flex items-center gap-0.5 sm:gap-1">
							<Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
							<span className="hidden sm:inline">Próximamente</span>
							<span className="sm:hidden">Próx.</span>
						</span>
					</div>
					<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
						<div className="p-1.5 sm:p-2 md:p-3 bg-yellow-100 rounded-lg sm:rounded-xl opacity-60 flex-shrink-0">
							<FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-600" />
						</div>
						<h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900">Laboratorios</h2>
					</div>
					<p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-3 sm:mb-4 md:mb-6 leading-relaxed">Estamos trabajando en integrar laboratorios con disponibilidad inmediata. Esta funcionalidad estará disponible próximamente.</p>
					<div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 bg-gray-200 text-gray-500 rounded-lg sm:rounded-xl font-semibold cursor-not-allowed opacity-60 w-full justify-center text-xs sm:text-sm md:text-base">
						<FlaskConical className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
						Próximamente
					</div>
				</div>
			</div>

			{/* Farmacias afiliadas */}
			<div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-5 md:p-6 lg:p-8 relative overflow-hidden">
				<div className="absolute top-1.5 sm:top-2 md:top-4 right-1.5 sm:right-2 md:right-4">
					<span className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold flex items-center gap-0.5 sm:gap-1">
						<Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
						<span className="hidden sm:inline">Próximamente</span>
						<span className="sm:hidden">Próx.</span>
					</span>
				</div>
				<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
					<div className="p-1.5 sm:p-2 md:p-3 bg-green-100 rounded-lg sm:rounded-xl opacity-60 flex-shrink-0">
						<ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
					</div>
					<h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Farmacias Afiliadas</h2>
				</div>
				<p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-4 md:mb-6 leading-relaxed">Estamos trabajando en integrar farmacias disponibles para surtir tus recetas médicas con descuentos especiales. Esta funcionalidad estará disponible próximamente.</p>
				<div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 bg-gray-200 text-gray-500 rounded-lg sm:rounded-xl font-semibold cursor-not-allowed opacity-60 text-xs sm:text-sm md:text-base">
					<ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
					Próximamente
				</div>
			</div>
		</div>
	);
}
