import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	eslint: {
		// Ignora ESLint durante el build en producción
		ignoreDuringBuilds: true,
	},
};

export default nextConfig;
