'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, User, Phone, MapPin, Calendar, Lock, Bell, AlertCircle, Save, 
  Plus, X, HeartPulse, ShieldAlert 
} from 'lucide-react';

type PatientProfile = {
	id: string;
	firstName: string;
	lastName: string;
	identifier: string | null;
	dob: string | null;
	gender: string | null;
	phone: string | null;
	address: string | null;
	allergies?: string | null;
	elderly_conditions?: string | null;
};

// Componente para manejar listas dinámicas (Alergias/Condiciones)
interface ListInputProps {
  label: string;
  items: string[];
  setItems: (items: string[]) => void;
  placeholder: string;
  icon: React.ReactNode;
  colorClass: string;
}

const ListInput = ({ label, items, setItems, placeholder, icon, colorClass }: ListInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const addItem = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      setItems([...items, trimmed]);
      setInputValue('');
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-wider">
        {icon}
        {label}
      </label>
      
      <div className="flex flex-wrap gap-2 mb-2 min-h-[40px]">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No hay registros añadidos...</p>
        ) : (
          items.map((item, index) => (
            <div 
              key={index} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all animate-in zoom-in-75 duration-300 ${colorClass}`}
            >
              {item.toUpperCase()}
              <button onClick={() => removeItem(index)} className="hover:scale-125 transition-transform">
                <X size={12} strokeWidth={3} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="relative group">
        <input
          type="text"
          id={`list-input-${label.toLowerCase().replace(/\s+/g, '-')}`}
          name={`medical-${label.toLowerCase().replace(/\s+/g, '-')}`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.readOnly = false}
          onBlur={(e) => e.target.readOnly = true}
          readOnly
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full pl-4 pr-12 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
        />
        <button 
          onClick={addItem}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus size={16} />
        </button>
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight pl-1">
        Presiona Enter para añadir a la lista
      </p>
    </div>
  );
};

export default function ConfiguracionPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [profile, setProfile] = useState<PatientProfile | null>(null);
	const [formData, setFormData] = useState({
		firstName: '',
		lastName: '',
		identifier: '',
		dob: '',
		gender: '',
		phone: '',
		address: '',
		notifications: {
			email: true,
			sms: false,
			push: false,
		},
	});

  // Estados separados para las listas interactivas
  const [allergiesList, setAllergiesList] = useState<string[]>([]);
  const [conditionsList, setConditionsList] = useState<string[]>([]);

	const [passwordForm, setPasswordForm] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadProfile();
	}, []);

	const loadProfile = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/profile', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar perfil');

			const data = await res.json();
			setProfile(data);
			setFormData({
				firstName: data.firstName || '',
				lastName: data.lastName || '',
				identifier: data.identifier || '',
				dob: data.dob ? data.dob.split('T')[0] : '',
				gender: data.gender || '',
				phone: data.phone || '',
				address: data.address || '',
				notifications: {
					email: true,
					sms: false,
					push: false,
				},
			});

      // Procesar strings de la DB a arrays para el frontend
      if (data.allergies) {
        setAllergiesList(data.allergies.split(',').map((s: string) => s.trim()).filter(Boolean));
      }
      if (data.elderly_conditions) {
        setConditionsList(data.elderly_conditions.split(',').map((s: string) => s.trim()).filter(Boolean));
      }

		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		try {
			setSaving(true);
			setError(null);
			setSuccess(null);

      const payload = {
        ...formData,
        allergies: allergiesList.join(', '),
        elderly_conditions: conditionsList.join(', ')
      };

			const res = await fetch('/api/patient/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al guardar');
			}

			setSuccess('Perfil y datos médicos actualizados');
			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			setError(err.message || 'Error al guardar el perfil');
		} finally {
			setSaving(false);
		}
	};

	const handlePasswordChange = async () => {
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			setError('Las contraseñas no coinciden');
			return;
		}

		if (passwordForm.newPassword.length < 8) {
			setError('La contraseña debe tener al menos 8 caracteres');
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(null);

			const res = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					currentPassword: passwordForm.currentPassword,
					newPassword: passwordForm.newPassword,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al cambiar contraseña');
			}

			setSuccess('Contraseña cambiada correctamente');
			setPasswordForm({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			setError(err.message || 'Error al cambiar la contraseña');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6 pb-20">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
					<h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
						<div className="p-2 bg-indigo-50 rounded-lg">
              <Settings className="w-6 h-6 text-indigo-600" />
            </div>
						<span>Configuración de Perfil</span>
					</h1>
					<p className="text-slate-500 text-sm mt-1 ml-11">Gestiona tu identidad digital y datos médicos críticos</p>
				</div>

				{/* Alertas */}
				{error && (
					<div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
						<AlertCircle className="w-5 h-5 text-rose-600" />
						<span className="text-rose-700 text-sm font-bold">{error}</span>
					</div>
				)}
				{success && (
					<div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
						<Save className="w-5 h-5 text-emerald-600" />
						<span className="text-emerald-700 text-sm font-bold">{success}</span>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Columna Izquierda: Datos Personales */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Datos Personales
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Apellido</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Identificación / Cédula</label>
                  <input
                    type="text"
                    value={formData.identifier}
                    onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nacimiento</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Género</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm font-medium appearance-none"
                  >
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Dirección de Domicilio</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN MÉDICA INTERACTIVA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-4">
                <HeartPulse className="w-5 h-5 text-rose-500" />
                Historial Médico Crítico
              </h2>
              
              <ListInput 
                label="Alergias Conocidas"
                items={allergiesList}
                setItems={setAllergiesList}
                placeholder="Ej: Penicilina, Maní..."
                icon={<ShieldAlert className="w-4 h-4 text-rose-500" />}
                colorClass="bg-rose-50 text-rose-700 border border-rose-100"
              />

              <div className="h-px bg-slate-100" />

              <ListInput 
                label="Condiciones Médicas"
                items={conditionsList}
                setItems={setConditionsList}
                placeholder="Ej: Diabetes Tipo 2, Asma..."
                icon={<HeartPulse className="w-4 h-4 text-blue-500" />}
                colorClass="bg-blue-50 text-blue-700 border border-blue-100"
              />
            </div>
          </div>

          {/* Columna Derecha: Seguridad y Notificaciones */}
          <div className="space-y-6">
            {/* Campo "Cebo" para Chrome - Evita que llene los campos médicos con el correo */}
            <input type="text" style={{ display: 'none' }} aria-hidden="true" />
            <input type="password" style={{ display: 'none' }} aria-hidden="true" />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                Seguridad
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Confirmar</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
                <button
                  onClick={handlePasswordChange}
                  disabled={saving}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-slate-200"
                >
                  {saving ? 'Cambiando...' : 'Actualizar Llave'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Canales
              </h2>
              <div className="space-y-3">
                {['Email', 'SMS', 'WhatsApp'].map((canal) => (
                  <label key={canal} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <span className="text-slate-700 text-xs font-bold uppercase tracking-tight">{canal}</span>
                    <input type="checkbox" defaultChecked={canal === 'Email'} className="w-4 h-4 text-indigo-600 rounded-lg focus:ring-indigo-500 border-slate-300" />
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-indigo-100 group"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4 group-hover:scale-125 transition-transform" />
              )}
              <span>{saving ? 'Sincronizando...' : 'Guardar Todo'}</span>
            </button>
          </div>
				</div>
			</div>
		</div>
	);
}
