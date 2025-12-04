import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	eslint: {
		// Ignora ESLint durante el build en producción
		ignoreDuringBuilds: true,
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'lyxlnduyzhwwupxjackg.supabase.co',
				pathname: '/storage/v1/object/public/**',
			},
		],
	},
} as NextConfig;

export default nextConfig;
