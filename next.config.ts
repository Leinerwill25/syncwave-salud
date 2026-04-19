import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
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
        experimental: {
                optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'framer-motion'],
        },
        compress: true,
        poweredByHeader: false,
        async headers() {
                return [
                        {
                                source: '/api/:path*',
                                headers: [
                                        { key: 'Vary', value: 'Origin' },
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