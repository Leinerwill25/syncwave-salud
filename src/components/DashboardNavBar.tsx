// components/DashboardNavBar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let supabaseClient: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
	supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
	console.warn('NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no definidas');
}

export default function DashboardNavBar() {
	const router = useRouter();

	const [loading, setLoading] = useState<boolean>(true);
	const [user, setUser] = useState<User | null>(null);
	const [displayName, setDisplayName] = useState<string>('Panel');
	const [signOutLoading, setSignOutLoading] = useState(false);

	useEffect(() => {
		let mounted = true;
		async function load() {
			setLoading(true);
			try {
				if (!supabaseClient) {
					setUser(null);
					setDisplayName('Panel');
					return;
				}

				const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
				if (sessionError) console.warn('supabase.getSession error', sessionError);

				let u = sessionData?.session?.user ?? null;

				if (!u) {
					const { data, error } = await supabaseClient.auth.getUser();
					if (!error && data?.user) u = data.user;
				}

				if (mounted) {
					setUser(u ?? null);
					const fullName = (u?.user_metadata && (u.user_metadata as any).fullName) ?? u?.email ?? '';
					setDisplayName(fullName || 'Panel');
				}
			} catch (err) {
				console.error('DashboardNavBar: error cargando usuario', err);
			} finally {
				if (mounted) setLoading(false);
			}
		}
		load();

		const sub = supabaseClient?.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_OUT') {
				setUser(null);
				setDisplayName('Panel');
			}
			if (event === 'SIGNED_IN' && session?.user) {
				const u = session.user;
				const name = (u.user_metadata && (u.user_metadata as any).fullName) ?? u.email ?? 'Panel';
				setUser(u);
				setDisplayName(name);
			}
		});

		return () => {
			mounted = false;
			if (sub && typeof (sub as any).subscription?.unsubscribe === 'function') {
				(sub as any).subscription.unsubscribe();
			}
		};
	}, []);

	async function handleLogout() {
		if (!supabaseClient) {
			router.push('/login');
			return;
		}

		setSignOutLoading(true);
		try {
			const { error } = await supabaseClient.auth.signOut();
			if (error) console.error('Error al cerrar sesión en Supabase:', error);
		} catch (err) {
			console.error('Logout error:', err);
		} finally {
			setSignOutLoading(false);
			router.push('/login');
		}
	}

	return (
		<header className="w-full bg-white border-b border-slate-100 sticky top-0 z-100">
			<div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
				{/* Left: logo */}
				<div className="flex items-center gap-3 min-w-0">
					<Link href="/" className="flex items-center gap-2">
						<Image src="/3.png" alt="Syncwave" width={36} height={36} className="rounded-md" />
						<span className="hidden md:inline-block font-semibold text-slate-800">Syncwave</span>
					</Link>
				</div>

				{/* Center: entity name */}
				<div className="flex-1 text-center">
					<div className="text-sm text-slate-500">Sesión</div>
					<div className="text-base md:text-lg font-medium text-slate-800 truncate">{loading ? 'Cargando...' : displayName}</div>
				</div>

				{/* Right: actions */}
				<div className="flex items-center gap-3">
					<Link href="/dashboard/clinic/profile" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-white text-slate-700 hover:bg-sky-50 transition text-sm" aria-label="Ir a perfil">
						<UserIcon className="w-4 h-4" />
						<span>Perfil</span>
					</Link>

					<button onClick={handleLogout} disabled={signOutLoading} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white ${signOutLoading ? 'bg-slate-400' : 'bg-sky-600 hover:bg-sky-700'} transition`} title="Cerrar sesión" aria-disabled={signOutLoading}>
						<LogOut className="w-4 h-4" />
						<span>{signOutLoading ? 'Cerrando...' : 'Cerrar sesión'}</span>
					</button>
				</div>
			</div>
		</header>
	);
}
