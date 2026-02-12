import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	// Deshabilitar source maps en desarrollo para evitar warnings
	productionBrowserSourceMaps: false,
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'lyxlnduyzhwwupxjackg.supabase.co',
				pathname: '/storage/v1/object/public/**',
			},
		],
	},
	// Optimizaciones de rendimiento
	experimental: {
		optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'framer-motion'],
		// Optimizar prefetching
		optimisticClientCache: true,
	},
	// Compresión (habilitada por defecto en Next.js 16)
	compress: true,
	// Mejorar prefetching de rutas
	poweredByHeader: false,
	// Headers de caché (Las de seguridad se manejan en middleware.ts para soporte de Nonces)
	async headers() {
		return [
			{
				source: '/api/:path*',
				headers: [
					{ key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
				],
			},
			{
				source: '/dashboard/:path*',
				headers: [
					{ key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
				],
			},
			{
				source: '/login',
				headers: [
					{ key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
				],
			},
			{
				source: '/:path*.{js,css,woff,woff2,ttf,otf}',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable',
					},
				],
			},
			{
				source: '/:path*.{jpg,jpeg,png,gif,webp,svg,ico}',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable',
					},
				],
			},
		];
	},
};

export default nextConfig;
