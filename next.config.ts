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
	// Optimizar producción
	swcMinify: true,
	// Mejorar prefetching de rutas
	poweredByHeader: false,
	// Headers de seguridad y caché
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'Content-Security-Policy',
						value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.google.com https://*.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://*.supabase.co https://*.ashira.click https://*.google.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://*.ashira.click https://api.groq.com; frame-ancestors 'none';",
					},
					{
						key: 'X-Frame-Options',
						value: 'DENY',
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin',
					},
					{
						key: 'Permissions-Policy',
						value: 'camera=(), microphone=(), geolocation=()',
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=31536000; includeSubDomains; preload',
					},
				],
			},
			{
				source: '/api/:path*',
				headers: [
					{ key: 'Access-Control-Allow-Credentials', value: 'true' },
					{ key: 'Access-Control-Allow-Origin', value: 'https://ashira.click, https://app.ashira.click' },
					{ key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
					{ key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
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
} as NextConfig;

export default nextConfig;
