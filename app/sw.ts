/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, ExpirationPlugin, CacheFirst, StaleWhileRevalidate, NetworkFirst } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

console.log('Service Worker starting...');

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // 1. PAGE NAVIGATIONS (HTML)
    {
      matcher: ({ request, url }) => {
        // Specifically ignore Next.js internal data requests (_rsc) to prevent reload loops
        return request.mode === 'navigate' && !url.searchParams.has('_rsc');
      },
      handler: new NetworkFirst({
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }),
        ],
      }),
    },

    // 2. NEXT.JS STATIC ASSETS (Fix: Remove 'navigate' check)
    {
      matcher: ({ request, url }) => {
        // These are NOT navigations. They are scripts and styles.
        return (
          url.pathname.startsWith('/_next/static/') ||
          request.destination === 'script' ||
          request.destination === 'style'
        );
      },
      handler: new CacheFirst({
        cacheName: 'next-static',
        plugins: [
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
      }),
    },

    // 3. IMAGES AND FONTS
    {
      matcher: ({ request }) =>
        request.destination === 'image' ||
        request.destination === 'font' ||
        request.url.includes('cloudinary.com'),
      handler: new StaleWhileRevalidate({
        cacheName: 'assets',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },

    // 4. MANIFEST.JSON and other root files
    {
      matcher: ({ request }) => {
        const url = new URL(request.url);
        return url.pathname === '/manifest.json' ||
          url.pathname === '/favicon.ico' ||
          url.pathname === '/quran.svg' ||
          url.pathname.startsWith('/icons/');
      },
      handler: new CacheFirst({
        cacheName: 'root-files',
      }),
    },

    // 5. API REQUESTS
    {
      matcher: ({ request }) => request.url.includes('/api/'),
      handler: new StaleWhileRevalidate({
        cacheName: 'api-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },

    // 6. Default cache for everything else
    ...defaultCache,
  ], fallbacks: {
    entries: [
      {
        // This tells Serwist to serve /playlist when a navigation fails
        url: "/playlist",
        matcher({ request }) {
          // Only apply this to document requests (page navigations)
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
