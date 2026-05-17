import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "fluent-ffmpeg"],
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    // OPTIONAL BUT RECOMMENDED: Add a global CSP for your main HTML pages too
                    // Otherwise, only your SW is protected by CSP.
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; connect-src 'self' *.cloudinary.com https://www.googletagmanager.com https://www.google-analytics.com; img-src 'self' data: blob: *.cloudinary.com https://www.googletagmanager.com https://www.google-analytics.com; worker-src 'self' blob:;"
                    }
                ],
            },
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/javascript; charset=utf-8',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                    {
                        key: 'Content-Security-Policy',
                        // UPDATED: Added GTM and Google Analytics domains
                        value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; worker-src 'self' blob:; connect-src 'self' *.cloudinary.com https://www.googletagmanager.com https://www.google-analytics.com; img-src 'self' data: blob: *.cloudinary.com https://www.googletagmanager.com https://www.google-analytics.com;",
                    },
                ],
            },
        ];
    }
};

export default nextConfig;
