'use client';

import { useEffect, useState } from 'react';

/**
 * Network connection type detection
 * Returns connection quality and adapts behavior accordingly
 */
export type NetworkType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

export interface NetworkInfo {
	type: NetworkType;
	isSlow: boolean;
	effectiveType: string | null;
	downlink: number | null;
	saveData: boolean;
}

/**
 * Hook to detect network connection quality
 * Adapts app behavior based on connection speed
 */
export function useNetworkAware(): NetworkInfo {
	const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
		type: 'unknown',
		isSlow: false,
		effectiveType: null,
		downlink: null,
		saveData: false,
	});

	useEffect(() => {
		// Check if browser supports Network Information API
		const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

		if (!connection) {
			// Default to slow if API not available (conservative approach)
			setNetworkInfo({
				type: 'unknown',
				isSlow: true,
				effectiveType: null,
				downlink: null,
				saveData: false,
			});
			return;
		}

		const updateNetworkInfo = () => {
			const effectiveType = connection.effectiveType || null;
			const downlink = connection.downlink || null;
			const saveData = connection.saveData || false;

			// Determine network type
			let type: NetworkType = 'unknown';
			let isSlow = false;

			if (effectiveType) {
				switch (effectiveType) {
					case 'slow-2g':
						type = 'slow-2g';
						isSlow = true;
						break;
					case '2g':
						type = '2g';
						isSlow = true;
						break;
					case '3g':
						type = '3g';
						isSlow = true; // Consider 3g as slow for medical apps
						break;
					case '4g':
						type = '4g';
						isSlow = false;
						break;
					default:
						type = 'unknown';
						isSlow = true; // Conservative: assume slow if unknown
				}
			} else if (downlink !== null) {
				// Fallback: use downlink speed
				if (downlink < 0.5) {
					type = 'slow-2g';
					isSlow = true;
				} else if (downlink < 1.5) {
					type = '2g';
					isSlow = true;
				} else if (downlink < 3) {
					type = '3g';
					isSlow = true;
				} else {
					type = '4g';
					isSlow = false;
				}
			} else {
				// No info available, assume slow (conservative)
				isSlow = true;
			}

			setNetworkInfo({
				type,
				isSlow,
				effectiveType,
				downlink,
				saveData,
			});
		};

		// Initial update
		updateNetworkInfo();

		// Listen for changes
		connection.addEventListener('change', updateNetworkInfo);

		return () => {
			connection.removeEventListener('change', updateNetworkInfo);
		};
	}, []);

	return networkInfo;
}

