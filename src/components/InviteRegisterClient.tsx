// src/components/InviteRegisterClient.tsx
'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type InviteProps = {
	token: string;
	email: string; // puede venir '' si no hay email predeterminado
	role: string;
	organizationId: string;
};

type Props = {
	invite: InviteProps;
	organizationName?: string | null;
};

function passwordStrengthScore(pw: string) {
	let score = 0;
	if (!pw) return 0;
	// length
	if (pw.length >= 8) score++;
	if (pw.length >= 12) score++;
	// variety
	if (/[A-Z]/.test(pw)) score++;
	if (/[0-9]/.test(pw)) score++;
	if (/[^A-Za-z0-9]/.test(pw)) score++;
	// normalize to 0..4
	if (score <= 1) return 1;
	if (score === 2) return 2;
	if (score === 3) return 3;
	return 4;
}

function strengthLabel(score: number) {
	switch (score) {
		case 1:
			return { text: 'Muy débil', color: 'bg-rose-500', textColor: 'text-rose-600' };
		case 2:
			return { text: 'Débil', color: 'bg-amber-400', textColor: 'text-amber-600' };
		case 3:
			return { text: 'Buena', color: 'bg-sky-400', textColor: 'text-sky-600' };
		case 4:
			return { text: 'Fuerte', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
		default:
			return { text: 'Muy débil', color: 'bg-rose-500', textColor: 'text-rose-600' };
	}
}

export default function InviteRegisterClient({ invite, organizationName }: Props) {
	const router = useRouter();

	const normalizedEmail = (invite.email ?? '').toString();
	const hasInviteEmail = Boolean(normalizedEmail.trim().length > 0);

	const [email, setEmail] = useState<string>(normalizedEmail);
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [phone, setPhone] = useState('');
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	// visibility toggles
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// strength
	const strengthScore = useMemo(() => passwordStrengthScore(password), [password]);
	const strength = strengthLabel(strengthScore);

	// validations
	const passwordsMatch = password === confirmPassword && password.length > 0;
	const passwordMinOk = password.length >= 8;
	const passwordStrongEnough = strengthScore >= 2; // ajustable: >=2 mínimo aceptable
	const submitDisabled = loading || !firstName.trim() || !lastName.trim() || !password || !confirmPassword || (hasInviteEmail ? false : !email.trim()) || !passwordMinOk || !passwordsMatch || !passwordStrongEnough;

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setMessage(null);

		if (!passwordMinOk) {
			setMessage('La contraseña debe tener al menos 8 caracteres.');
			return;
		}
		if (!passwordsMatch) {
			setMessage('Las contraseñas no coinciden.');
			return;
		}
		if (!passwordStrongEnough) {
			setMessage('La contraseña es demasiado débil. Añade más caracteres o mezcla mayúsculas, números y símbolos.');
			return;
		}

		setLoading(true);
		try {
			const res = await fetch('/api/register-from-invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token: invite.token,
					email: email.trim(),
					firstName: firstName.trim(),
					lastName: lastName.trim(),
					password,
					phone: phone.trim(),
				}),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data?.message ?? 'Error registrando');

			setMessage('Registro completado. Serás redirigido al login.');
			setTimeout(() => router.push('/login'), 900);
		} catch (err: any) {
			setMessage(err?.message ?? 'Error registrando la cuenta. Intenta de nuevo.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="mt-4">
			<form onSubmit={onSubmit} className="space-y-6">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label className="block text-sm font-medium text-slate-700">Nombre</label>
						<input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Ej. María" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700">Apellido</label>
						<input value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Ej. Pérez" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-slate-700">Email</label>
					{hasInviteEmail ? (
						<div className="mt-1 flex items-center gap-3">
							<input value={email} readOnly className="block w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-slate-700" aria-readonly />
							<div className="text-sm text-slate-500">Email pre-asignado por invitación</div>
						</div>
					) : (
						<input value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu-email@ejemplo.com" type="email" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
					)}
				</div>

				{/* Passwords */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label className="block text-sm font-medium text-slate-700">Contraseña</label>
						<div className="relative mt-1">
							<input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mínimo 8 caracteres" className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 shadow-sm placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" aria-describedby="pw-help" />
							<button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
								{showPassword ? 'Ocultar' : 'Mostrar'}
							</button>
						</div>

						{/* strength meter */}
						<div className="mt-2">
							<div className="flex items-center justify-between text-xs">
								<div className="text-slate-500">Fortaleza</div>
								<div className={`${strength.textColor} font-medium`}>{strength.text}</div>
							</div>
							<div className="mt-1 h-2 w-full rounded bg-slate-100 overflow-hidden">
								<div className={`h-full ${strength.color} transition-all`} style={{ width: `${(strengthScore / 4) * 100}%` }} />
							</div>
							<div id="pw-help" className="mt-1 text-xs text-slate-400">
								Recomendado: 12+ caracteres con mayúsculas, números y símbolos para máxima seguridad.
							</div>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700">Confirmar contraseña</label>
						<div className="relative mt-1">
							<input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Repite la contraseña" className={`block w-full rounded-lg border px-3 py-2 pr-10 shadow-sm placeholder-slate-400 focus:ring-1 ${confirmPassword.length === 0 ? 'border-slate-200 focus:border-sky-500 focus:ring-sky-500' : passwordsMatch ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-400' : 'border-rose-200 focus:border-rose-400 focus:ring-rose-400'}`} aria-invalid={!passwordsMatch && confirmPassword.length > 0} />
							<button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700" aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
								{showConfirmPassword ? 'Ocultar' : 'Mostrar'}
							</button>
						</div>

						<div className="mt-2 text-xs">{confirmPassword.length > 0 ? passwordsMatch ? <div className="text-emerald-600">Las contraseñas coinciden</div> : <div className="text-rose-600">Las contraseñas no coinciden</div> : <div className="text-slate-400">Confirma tu contraseña</div>}</div>
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-slate-700">Teléfono (opcional)</label>
					<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+58 412 123 4567" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
				</div>

				<div className="pt-3 border-t border-slate-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="text-sm text-slate-500">Registrándote en</div>
						<div className="text-sm font-medium text-slate-800">{organizationName ?? invite.organizationId}</div>
					</div>

					<div className="flex items-center gap-3">
						<button type="submit" disabled={submitDisabled} className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${submitDisabled ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-sky-600 text-white hover:opacity-95 focus:ring-sky-500'}`}>
							{loading ? 'Registrando…' : 'Crear cuenta y unir a la clínica'}
						</button>
					</div>
				</div>

				{message && <div className="mt-3 rounded-md bg-amber-50 border border-amber-100 p-3 text-amber-800 text-sm">{message}</div>}
			</form>
		</div>
	);
}
