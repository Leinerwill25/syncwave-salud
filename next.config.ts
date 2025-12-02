import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	eslint: {
		// Ignora ESLint durante el build en producción
		ignoreDuringBuilds: true,
	},
} as NextConfig;

export default nextConfig;
