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
		const securityHeaders = [
			{ key: 'X-Content-Type-Options', value: 'nosniff' },
			{ key: 'X-Frame-Options', value: 'DENY' },
			{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
			{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
			{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
			{ key: 'Server', value: 'ASHIRA-SECURE' }, // Ofuscación de servidor
		];

		return [
			{
				source: '/(.*)',
				headers: securityHeaders,
			},
			{
				source: '/api/:path*',
				headers: [
					{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, private' },
					{ key: 'Pragma', value: 'no-cache' },
					{ key: 'Expires', value: '0' },
					{ key: 'Vary', value: 'Origin' }, // Importante para CORS dinámico
				],
			},
			{
				source: '/dashboard/:path*',
				headers: [
					{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, private' },
					{ key: 'Pragma', value: 'no-cache' },
					{ key: 'Expires', value: '0' },
				],
			},
			{
				source: '/login',
				headers: [
					{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, private' },
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
	// Configurar el root para Turbopack para evitar problemas de detección de workspace
	turbopack: {
		root: 'C:/Users/Dereck/Desktop/Proyectos Grandes/Clinica_Syncwave_MVP/my-app',
	},
};

export default nextConfig;
