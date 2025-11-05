'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ value, label = 'Copiar' }: { value: string; label?: string }) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			// ignore
		}
	}

	return (
		<button type="button" onClick={handleCopy} title={copied ? 'Copiado' : label} className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium border bg-white/60 hover:bg-white dark:bg-transparent transition" aria-live="polite">
			{copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
			<span>{copied ? 'Copiado' : 'Copiar'}</span>
		</button>
	);
}
