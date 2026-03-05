import Link from 'next/link'
import { Frown } from 'lucide-react'

// This is a Server Component - no 'use client' directive
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Static 404 content without any hooks */}
        <div className="relative mb-8">
          <h1 className="text-[150px] md:text-[200px] font-bold text-white/5 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <Frown className="w-24 h-24 text-green-500/30" />
          </div>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Page Not Found
        </h2>
        
        <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Simple navigation without hooks */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <Link
            href="/"
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all w-full sm:w-auto"
          >
            Go Home
          </Link>

          <Link
            href="/playlist"
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 w-full sm:w-auto"
          >
            Browse Playlists
          </Link>
        </div>
      </div>
    </div>
  )
}