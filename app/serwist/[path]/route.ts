import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
import { NextResponse } from 'next/server';

// Use a stable revision that doesn't change every time
const revision = process.env.NODE_ENV === 'development' 
  ? 'dev-1.0.0' // Static revision for development
  : spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ?? 'v1.0.0';

const { GET: SerwistGET } = createSerwistRoute({
  additionalPrecacheEntries: [
    { url: "/", revision },
    { url: '/playlist', revision },
    { url: "/manifest.json", revision },
    { url: "/quran.svg", revision },
    { url: "/favicon.ico", revision }
  ],
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
});

export const GET = async (req: Request, { params }: { params: Promise<{ path: string }> }) => {
  const response = await SerwistGET(req, { params });

  // Convert Headers to a plain object safely
  const headersObj: Record<string, string> = {};
  
  // Use forEach which is supported by Headers object
  if (response.headers && typeof response.headers.forEach === 'function') {
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
  }

  // Add cache control headers to prevent constant updates
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'max-age=86400',
      ...headersObj,
    },
  });
};

export const dynamic = 'force-static';