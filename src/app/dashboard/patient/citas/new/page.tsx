'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Building2, Search, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Doctor = {
	id: string;
	name: string | null;
	email: string | null;
	medic_profile: {
		specialty: string | null;
		private_specialty: string | null;
		photo_url: string | null;
	} | null;
};

type Organization = {
	id: string;
	name: string;
	type: string;
	organization_id?: string;
	clinic_profile: {
		trade_name: string | null;
		specialties: any[];
		address_operational?: string | null;
	} | null;
};

export default function NewAppointmentPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [step, setStep] = useState<'organization' | 'doctor' | 'schedule' | 'confirm'>('organization');
	
	// Form data
	const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
	const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
	const [selectedDate, setSelectedDate] = useState<string>('');
	const [selectedTime, setSelectedTime] = useState<string>('');
	const [reason, setReason] = useState<string>('');
	const [location, setLocation] = useState<string>('');

	// Data
	const [organizations, setOrganizations] = useState<Organization[]>([]);
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [availableSlots, setAvailableSlots] = useState<string[]>([]);
	const [searchOrg, setSearchOrg] = useState('');
	const [searchDoctor, setSearchDoctor] = useState('');

	useEffect(() => {
		loadOrganizations();
	}, []);

	useEffect(() => {
		if (selectedOrganization) {
			loadDoctors();
		}
	}, [selectedOrganization]);

	useEffect(() => {
		if (selectedDoctor && selectedDate) {
			loadAvailableSlots();
		}
	}, [selectedDoctor, selectedDate]);

	const loadOrganizations = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/clinics?per_page=50', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar organizaciones');

			const data = await res.json();
			// Mapear los datos para incluir organization_id y organization
			const orgs = (data.data || []).map((clinic: any) => ({
				id: clinic.organization_id || clinic.organization?.id || clinic.id,
				name: clinic.organization?.name || clinic.legal_name,
				type: clinic.organization?.type || 'CLINICA',
				organization_id: clinic.organization_id || clinic.organization?.id,
				clinic_profile: {
					trade_name: clinic.trade_name,
					specialties: clinic.specialties,
					address_operational: clinic.address_operational,
				},
			}));
			setOrganizations(orgs);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const loadDoctors = async () => {
		if (!selectedOrganization) return;

		try {
			setLoading(true);
			// Usar organization_id si está disponible, sino usar id
			const orgId = selectedOrganization.organization_id || selectedOrganization.id;
			const res = await fetch(`/api/patient/clinics/${orgId}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar médicos');

			const clinicData = await res.json();
			if (clinicData.doctors) {
				setDoctors(clinicData.doctors || []);
			}
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const loadAvailableSlots = async () => {
		if (!selectedDoctor || !selectedDate) return;

		try {
			setLoading(true);
			const params = new URLSearchParams({
				doctor_id: selectedDoctor.id,
				date: selectedDate,
			});
			if (selectedOrganization) {
				const orgId = selectedOrganization.organization_id || selectedOrganization.id;
				params.set('organization_id', orgId);
			}

			const res = await fetch(`/api/patient/appointments/available?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar horarios disponibles');

			const data = await res.json();
			setAvailableSlots(data.availableSlots || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async () => {
		if (!selectedDate || !selectedTime || !selectedOrganization) {
			alert('Por favor complete todos los campos requeridos');
			return;
		}

		try {
			setSubmitting(true);
			const scheduledAt = `${selectedDate}T${selectedTime}:00`;

			// Usar organization_id si está disponible, sino usar id
			const orgId = selectedOrganization.organization_id || selectedOrganization.id;
			
			const res = await fetch('/api/patient/appointments/new', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					doctor_id: selectedDoctor?.id || null,
					organization_id: orgId,
					scheduled_at: scheduledAt,
					duration_minutes: 30,
					reason: reason || null,
					location: location || selectedOrganization.clinic_profile?.address_operational || null,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al crear la cita');
			}

			const data = await res.json();
			alert('Cita creada correctamente. El médico recibirá una notificación.');
			router.push('/dashboard/patient/citas');
		} catch (err: any) {
			alert(err.message || 'Error al crear la cita');
		} finally {
			setSubmitting(false);
		}
	};

	const filteredOrgs = organizations.filter(org =>
		org.name.toLowerCase().includes(searchOrg.toLowerCase()) ||
		org.clinic_profile?.trade_name?.toLowerCase().includes(searchOrg.toLowerCase())
	);

	const filteredDoctors = doctors.filter(doctor =>
		doctor.name?.toLowerCase().includes(searchDoctor.toLowerCase())
	);

	// Obtener fecha mínima (hoy)
	const today = new Date().toISOString().split('T')[0];
	const maxDate = new Date();
	maxDate.setMonth(maxDate.getMonth() + 3);
	const maxDateStr = maxDate.toISOString().split('T')[0];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
				<div className="flex items-center gap-4 mb-6">
					<Link
						href="/dashboard/patient/citas"
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<ChevronLeft className="w-5 h-5 text-gray-600" />
					</Link>
					<div>
						<h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
							Nueva Cita
						</h1>
						<p className="text-gray-600 mt-1">Agenda una cita médica</p>
					</div>
				</div>

				{/* Progress Steps */}
				<div className="flex items-center justify-between mb-8">
					{[
						{ id: 'organization', label: 'Clínica', icon: Building2 },
						{ id: 'doctor', label: 'Médico', icon: User },
						{ id: 'schedule', label: 'Horario', icon: Calendar },
						{ id: 'confirm', label: 'Confirmar', icon: CheckCircle },
					].map((s, idx) => {
						const Icon = s.icon;
						const isActive = step === s.id;
						const isCompleted = ['organization', 'doctor', 'schedule', 'confirm'].indexOf(step) > idx;
						
						return (
							<div key={s.id} className="flex items-center flex-1">
								<div className="flex flex-col items-center flex-1">
									<div
										className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
											isActive
												? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110'
												: isCompleted
													? 'bg-green-500 text-white'
													: 'bg-gray-200 text-gray-500'
										}`}
									>
										<Icon className="w-6 h-6" />
									</div>
									<span className={`mt-2 text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
										{s.label}
									</span>
								</div>
								{idx < 3 && (
									<div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Step 1: Select Organization */}
			{step === 'organization' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
					<h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
						<Building2 className="w-6 h-6 text-indigo-600" />
						Selecciona una Clínica o Consultorio
					</h2>

					<div className="relative mb-6">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Buscar clínica o consultorio..."
							value={searchOrg}
							onChange={(e) => setSearchOrg(e.target.value)}
							className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
					</div>

					{loading ? (
						<div className="text-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{filteredOrgs.map((org) => (
								<button
									key={org.id}
									onClick={() => {
										setSelectedOrganization(org);
										setStep('doctor');
									}}
									className={`p-6 rounded-xl border-2 transition-all text-left ${
										selectedOrganization?.id === org.id
											? 'border-indigo-600 bg-indigo-50 shadow-lg'
											: 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
									}`}
								>
									<div className="flex items-center gap-3 mb-2">
										<div className="p-2 bg-indigo-100 rounded-lg">
											<Building2 className="w-5 h-5 text-indigo-600" />
										</div>
										<h3 className="font-bold text-gray-900">
											{org.clinic_profile?.trade_name || org.name}
										</h3>
									</div>
									<p className="text-sm text-gray-600">{org.name}</p>
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{/* Step 2: Select Doctor */}
			{step === 'doctor' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
							<User className="w-6 h-6 text-indigo-600" />
							Selecciona un Médico
						</h2>
						<button
							onClick={() => setStep('organization')}
							className="text-indigo-600 hover:text-indigo-700 font-medium"
						>
							Cambiar clínica
						</button>
					</div>

					<div className="relative mb-6">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Buscar médico..."
							value={searchDoctor}
							onChange={(e) => setSearchDoctor(e.target.value)}
							className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
					</div>

					{loading ? (
						<div className="text-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
						</div>
					) : (
						<div className="space-y-4">
							{filteredDoctors.length === 0 ? (
								<div className="text-center py-12 text-gray-500">
									<User className="w-16 h-16 mx-auto mb-4 opacity-50" />
									<p>No hay médicos disponibles en esta clínica</p>
									<button
										onClick={() => {
											setSelectedDoctor(null);
											setStep('schedule');
										}}
										className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
									>
										Continuar sin seleccionar médico
									</button>
								</div>
							) : (
								filteredDoctors.map((doctor) => (
									<button
										key={doctor.id}
										onClick={() => {
											setSelectedDoctor(doctor);
											setStep('schedule');
										}}
										className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
											selectedDoctor?.id === doctor.id
												? 'border-indigo-600 bg-indigo-50 shadow-lg'
												: 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
										}`}
									>
										<div className="flex items-center gap-4">
											{doctor.medic_profile?.photo_url ? (
												<img
													src={doctor.medic_profile.photo_url}
													alt={doctor.name || 'Médico'}
													className="w-16 h-16 rounded-full object-cover"
												/>
											) : (
												<div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
													<User className="w-8 h-8 text-indigo-600" />
												</div>
											)}
											<div className="flex-1">
												<h3 className="font-bold text-gray-900 text-lg">
													Dr. {doctor.name || 'Médico'}
												</h3>
												<p className="text-gray-600">
													{doctor.medic_profile?.specialty ||
														doctor.medic_profile?.private_specialty ||
														'Especialista'}
												</p>
											</div>
										</div>
									</button>
								))
							)}
						</div>
					)}
				</div>
			)}

			{/* Step 3: Select Schedule */}
			{step === 'schedule' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
							<Calendar className="w-6 h-6 text-indigo-600" />
							Selecciona Fecha y Hora
						</h2>
						<button
							onClick={() => setStep('doctor')}
							className="text-indigo-600 hover:text-indigo-700 font-medium"
						>
							Cambiar médico
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
							<input
								type="date"
								value={selectedDate}
								onChange={(e) => {
									setSelectedDate(e.target.value);
									setSelectedTime('');
								}}
								min={today}
								max={maxDateStr}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
							{selectedDate ? (
								<div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
									{availableSlots.length === 0 ? (
										<div className="col-span-3 text-center py-8 text-gray-500">
											<Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
											<p>No hay horarios disponibles para esta fecha</p>
										</div>
									) : (
										availableSlots.map((slot) => (
											<button
												key={slot}
												onClick={() => setSelectedTime(slot)}
												className={`px-4 py-2 rounded-lg border-2 transition-all ${
													selectedTime === slot
														? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
														: 'border-gray-200 hover:border-indigo-300 text-gray-700'
												}`}
											>
												{slot}
											</button>
										))
									)}
								</div>
							) : (
								<div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
									Selecciona una fecha primero
								</div>
							)}
						</div>
					</div>

					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">Motivo de la consulta</label>
						<textarea
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Describe el motivo de tu consulta..."
							rows={3}
							className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
					</div>

					<div className="flex gap-4">
						<button
							onClick={() => setStep('doctor')}
							className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
						>
							Anterior
						</button>
						<button
							onClick={() => setStep('confirm')}
							disabled={!selectedDate || !selectedTime}
							className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Continuar
						</button>
					</div>
				</div>
			)}

			{/* Step 4: Confirm */}
			{step === 'confirm' && (
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
					<h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
						<CheckCircle className="w-6 h-6 text-green-600" />
						Confirmar Cita
					</h2>

					<div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
						<div className="flex items-center gap-3">
							<Building2 className="w-5 h-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-600">Clínica</p>
								<p className="font-semibold text-gray-900">
									{selectedOrganization?.clinic_profile?.trade_name || selectedOrganization?.name}
								</p>
							</div>
						</div>
						{selectedDoctor && (
							<div className="flex items-center gap-3">
								<User className="w-5 h-5 text-gray-400" />
								<div>
									<p className="text-sm text-gray-600">Médico</p>
									<p className="font-semibold text-gray-900">Dr. {selectedDoctor.name}</p>
								</div>
							</div>
						)}
						<div className="flex items-center gap-3">
							<Calendar className="w-5 h-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-600">Fecha y Hora</p>
								<p className="font-semibold text-gray-900">
									{new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('es-ES', {
										weekday: 'long',
										year: 'numeric',
										month: 'long',
										day: 'numeric',
									})} a las {selectedTime}
								</p>
							</div>
						</div>
						{reason && (
							<div>
								<p className="text-sm text-gray-600 mb-1">Motivo</p>
								<p className="text-gray-900">{reason}</p>
							</div>
						)}
					</div>

					<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
						<p className="text-sm text-blue-800">
							El médico recibirá una notificación y podrá confirmar tu cita. Te notificaremos cuando sea confirmada.
						</p>
					</div>

					<div className="flex gap-4">
						<button
							onClick={() => setStep('schedule')}
							className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
						>
							Anterior
						</button>
						<button
							onClick={handleSubmit}
							disabled={submitting}
							className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{submitting ? 'Creando cita...' : 'Confirmar y Crear Cita'}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

