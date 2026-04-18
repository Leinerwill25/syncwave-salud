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
			{
				protocol: 'https',
				hostname: 'img.youtube.com',
				pathname: '/vi/**',
			},
		],
	},
	// Optimizaciones de rendimiento
	experimental: {
		optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'framer-motion'],
	},
	// Compresión (habilitada por defecto en Next.js 16)
	compress: true,
	// Mejorar prefetching de rutas
	poweredByHeader: false,
	// Headers de seguridad y caché
	async headers() {
		return [
			{
				source: '/api/:path*',
				headers: [
					{ key: 'Vary', value: 'Origin' }, // Importante para CORS dinámico
				],
			},
			{
				source: '/:path*.{js,css,woff,woff2,ttf,otf}',
				headers: [
					{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
				],
			},
			{
				source: '/:path*.{jpg,jpeg,png,gif,webp,svg,ico}',
				headers: [
					{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
				],
			},
		];
	},
};

export default nextConfig;
