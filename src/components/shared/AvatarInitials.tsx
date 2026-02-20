/** @refactored ASHIRA Clinic Dashboard - AvatarInitials */
'use client';

import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarInitialsProps {
	name: string;
	size?: AvatarSize;
	colorIndex?: number;
	className?: string;
}

// 8 gradientes curados con paleta profesional para plataforma médica
const GRADIENT_PALETTE = [
	'from-sky-500 to-sky-600',
	'from-teal-500 to-teal-600',
	'from-indigo-500 to-indigo-600',
	'from-violet-500 to-violet-600',
	'from-emerald-500 to-emerald-600',
	'from-cyan-500 to-cyan-600',
	'from-blue-500 to-blue-600',
	'from-slate-500 to-slate-600',
] as const;

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string }> = {
	xs: { container: 'w-7 h-7', text: 'text-[10px]' },
	sm: { container: 'w-9 h-9', text: 'text-xs' },
	md: { container: 'w-11 h-11', text: 'text-sm' },
	lg: { container: 'w-14 h-14', text: 'text-base' },
};

function hashName(name: string): number {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash << 5) - hash + name.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

function getInitials(name: string): string {
	if (!name.trim()) return '?';
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function AvatarInitials({
	name,
	size = 'md',
	colorIndex,
	className = '',
}: AvatarInitialsProps) {
	const idx = colorIndex !== undefined ? Math.abs(colorIndex) % GRADIENT_PALETTE.length : hashName(name) % GRADIENT_PALETTE.length;
	const gradient = GRADIENT_PALETTE[idx];
	const { container, text } = SIZE_CLASSES[size];

	return (
		<div
			className={`flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white font-semibold select-none ${container} ${text} ${className}`}
			aria-hidden="true"
			title={name}
		>
			{getInitials(name)}
		</div>
	);
}

export default AvatarInitials;
