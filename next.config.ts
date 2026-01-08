import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
	// Optimizar producción
	swcMinify: true,
	// Mejorar prefetching de rutas
	poweredByHeader: false,
	// Headers de caché para assets estáticos
	async headers() {
		return [
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
} as NextConfig;

export default nextConfig;
