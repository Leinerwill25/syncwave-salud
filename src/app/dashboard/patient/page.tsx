'use client';

import { useState, useEffect } from 'react';
import { Calendar, FileText, Pill, FlaskConical, Search, MapPin, Clock, Stethoscope, Building2, ShoppingBag, ChevronRight } from 'lucide-react';
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
			const [prescriptionsRes, resultsRes, messagesRes] = await Promise.all([
				fetch('/api/patient/recetas?status=active', { credentials: 'include' }),
				fetch('/api/patient/resultados', { credentials: 'include' }),
				fetch('/api/patient/messages', { credentials: 'include' }),
			]);

			if (prescriptionsRes.ok) {
				const prescData = await prescriptionsRes.json();
				setStats(prev => ({ ...prev, activePrescriptions: prescData.data?.length || 0 }));
			}

			if (resultsRes.ok) {
				const resultsData = await resultsRes.json();
				setStats(prev => ({ ...prev, pendingResults: resultsData.data?.length || 0 }));
			}

			if (messagesRes.ok) {
				const messagesData = await messagesRes.json();
				const unread = (messagesData.messages || []).filter((m: any) => !m.read).length;
				setStats(prev => ({ ...prev, unreadMessages: unread }));
			}

			const appointmentsCountRes = await fetch('/api/patient/appointments?status=upcoming', {
				credentials: 'include',
			});
			if (appointmentsCountRes.ok) {
				const appointmentsCountData = await appointmentsCountRes.json();
				setStats(prev => ({ ...prev, upcomingAppointments: appointmentsCountData.data?.length || 0 }));
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
			<div className="space-y-6">
				<div className="animate-pulse space-y-6">
					<div className="h-8 bg-gray-200 rounded w-1/3"></div>
					<div className="h-64 bg-gray-200 rounded"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
				{/* Header */}
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
								Bienvenido, {patientName}
							</h1>
							<p className="text-gray-600 text-lg">Gestiona tu salud de manera fácil y rápida</p>
						</div>
						<div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
							<Clock className="w-4 h-4" />
							<span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
						</div>
					</div>
				</div>

				{/* Próxima cita */}
				{nextAppointment && (
					<div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
						<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
						<div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
						<div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-4">
									<div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
										<Calendar className="w-6 h-6" />
									</div>
									<h2 className="text-2xl font-bold">Próxima Cita</h2>
								</div>
								<div className="space-y-2">
									<p className="text-lg font-semibold text-white/90">
										{new Date(nextAppointment.scheduled_at).toLocaleDateString('es-ES', {
											weekday: 'long',
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										})}
									</p>
									<p className="text-white/80 flex items-center gap-2">
										<Clock className="w-4 h-4" />
										{new Date(nextAppointment.scheduled_at).toLocaleTimeString('es-ES', {
											hour: '2-digit',
											minute: '2-digit',
										})}
									</p>
									<div className="flex items-center gap-2 mt-3">
										<Stethoscope className="w-4 h-4 text-white/80" />
										<p className="text-white/90">
											Dr. {nextAppointment.doctor?.name || 'Médico'}
										</p>
									</div>
									{nextAppointment.organization?.name && (
										<div className="flex items-center gap-2">
											<Building2 className="w-4 h-4 text-white/80" />
											<p className="text-white/80">{nextAppointment.organization.name}</p>
										</div>
									)}
									{nextAppointment.reason && (
										<p className="text-white/70 mt-2 text-sm bg-white/10 rounded-lg p-2 inline-block">
											Motivo: {nextAppointment.reason}
										</p>
									)}
								</div>
							</div>
							<Link
								href="/dashboard/patient/citas"
								className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
							>
								Ver Todas las Citas
							</Link>
						</div>
					</div>
				)}

				{/* Buscador Global */}
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
					<h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
						<div className="p-2 bg-indigo-100 rounded-lg">
							<Search className="w-6 h-6 text-indigo-600" />
						</div>
						Buscador Global
					</h2>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<input
								type="text"
								placeholder="Buscar clínicas, farmacias, laboratorios..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
							<select
								value={orgType}
								onChange={(e) => setOrgType(e.target.value)}
								className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							>
								<option value="">Tipo de Organización</option>
								<option value="CLINICA">Clínica</option>
								<option value="FARMACIA">Farmacia</option>
								<option value="LABORATORIO">Laboratorio</option>
								<option value="CONSULTORIO_PRIVADO">Consultorio Privado</option>
							</select>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<input
								type="text"
								placeholder="Especialidad"
								value={specialty}
								onChange={(e) => setSpecialty(e.target.value)}
								className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
							<input
								type="text"
								placeholder="Tipo de examen (solo laboratorios)"
								value={examType}
								onChange={(e) => setExamType(e.target.value)}
								className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
							<input
								type="text"
								placeholder="Presupuesto máximo"
								value={budget}
								onChange={(e) => setBudget(e.target.value)}
								className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
						</div>
						<button
							onClick={handleSearch}
							className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
						>
							<Search className="w-5 h-5" />
							Buscar
						</button>
					</div>
				</div>

				{/* Cards de Acción Rápida */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<Link
						href="/dashboard/patient/citas"
						className="group bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border border-white/20 hover:border-indigo-200 hover:-translate-y-1"
					>
						<div className="flex items-center justify-between mb-4">
							<div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform shadow-lg">
								<Calendar className="w-6 h-6 text-white" />
							</div>
							{stats.upcomingAppointments > 0 && (
								<span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-md">
									{stats.upcomingAppointments}
								</span>
							)}
						</div>
						<h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Ver Citas</h3>
						<p className="text-sm text-gray-600">Gestiona tus citas médicas</p>
					</Link>

					<Link
						href="/dashboard/patient/historial"
						className="group bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border border-white/20 hover:border-green-200 hover:-translate-y-1"
					>
						<div className="flex items-center justify-between mb-4">
							<div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl group-hover:scale-110 transition-transform shadow-lg">
								<FileText className="w-6 h-6 text-white" />
							</div>
						</div>
						<h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">Ver Historial</h3>
						<p className="text-sm text-gray-600">Consulta tu historial médico</p>
					</Link>

					<Link
						href="/dashboard/patient/recetas"
						className="group bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border border-white/20 hover:border-purple-200 hover:-translate-y-1"
					>
						<div className="flex items-center justify-between mb-4">
							<div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform shadow-lg">
								<Pill className="w-6 h-6 text-white" />
							</div>
							{stats.activePrescriptions > 0 && (
								<span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full shadow-md">
									{stats.activePrescriptions}
								</span>
							)}
						</div>
						<h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">Ver Recetas</h3>
						<p className="text-sm text-gray-600">Tus recetas médicas activas</p>
					</Link>

					<Link
						href="/dashboard/patient/resultados"
						className="group bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border border-white/20 hover:border-yellow-200 hover:-translate-y-1"
					>
						<div className="flex items-center justify-between mb-4">
							<div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl group-hover:scale-110 transition-transform shadow-lg">
								<FlaskConical className="w-6 h-6 text-white" />
							</div>
							{stats.pendingResults > 0 && (
								<span className="px-3 py-1 bg-yellow-600 text-white text-xs font-bold rounded-full shadow-md">
									{stats.pendingResults}
								</span>
							)}
						</div>
						<h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-yellow-600 transition-colors">Ver Resultados</h3>
						<p className="text-sm text-gray-600">Resultados de laboratorio</p>
					</Link>
				</div>

				{/* Secciones destacadas */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Clínicas destacadas */}
					<div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-3">
								<div className="p-3 bg-indigo-100 rounded-xl">
									<Building2 className="w-6 h-6 text-indigo-600" />
								</div>
								<h2 className="text-2xl font-bold text-gray-900">Clínicas Destacadas</h2>
							</div>
							<Link
								href="/dashboard/patient/clinics"
								className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1"
							>
								Ver todas <ChevronRight className="w-4 h-4" />
							</Link>
						</div>
						<p className="text-gray-600 mb-6">
							Explora las mejores clínicas disponibles para ti con especialistas certificados
						</p>
						<Link
							href="/dashboard/patient/clinics"
							className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
						>
							<Building2 className="w-5 h-5" />
							Explorar Clínicas
						</Link>
					</div>

					{/* Laboratorios */}
					<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-3">
								<div className="p-3 bg-yellow-100 rounded-xl">
									<FlaskConical className="w-6 h-6 text-yellow-600" />
								</div>
								<h2 className="text-xl font-bold text-gray-900">Laboratorios</h2>
							</div>
							<Link
								href="/dashboard/patient/labs"
								className="text-yellow-600 hover:text-yellow-700 font-semibold text-sm flex items-center gap-1"
							>
								Ver todos <ChevronRight className="w-4 h-4" />
							</Link>
						</div>
						<p className="text-gray-600 mb-6 text-sm">
							Encuentra laboratorios con disponibilidad inmediata
						</p>
						<Link
							href="/dashboard/patient/labs"
							className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-lg hover:shadow-xl w-full justify-center"
						>
							<FlaskConical className="w-5 h-5" />
							Explorar Laboratorios
						</Link>
					</div>
				</div>

				{/* Farmacias afiliadas */}
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-green-100 rounded-xl">
								<ShoppingBag className="w-6 h-6 text-green-600" />
							</div>
							<h2 className="text-2xl font-bold text-gray-900">Farmacias Afiliadas</h2>
						</div>
						<Link
							href="/dashboard/patient/pharmacies"
							className="text-green-600 hover:text-green-700 font-semibold text-sm flex items-center gap-1"
						>
							Ver todas <ChevronRight className="w-4 h-4" />
						</Link>
					</div>
					<p className="text-gray-600 mb-6">
						Farmacias disponibles para surtir tus recetas médicas con descuentos especiales
					</p>
					<Link
						href="/dashboard/patient/pharmacies"
						className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl"
					>
						<ShoppingBag className="w-5 h-5" />
						Explorar Farmacias
					</Link>
				</div>
		</div>
	);
}
