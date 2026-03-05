'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Github, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGitHubLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('github', {
        callbackUrl,
        redirect: true,
      })

      if (result?.error) {
        setError('Failed to sign in with GitHub')
      }
    } catch (error) {
      setError('An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex justify-center items-center h-full'>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            QariSpot
          </h1>
          <p className="text-zinc-400">
            Your Quranic Recitation Companion
          </p>
        </div>

        {/* Login Card */}
        <div className="backdrop-blur-sm rounded-2xl p-8 border border-zinc-800">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Sign In
          </h2>

          {/* GitHub Button */}
          <button
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Github className="h-5 w-5" />
                Continue with GitHub
              </>
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-zinc-400 hover:text-zinc-300 text-sm transition-colors"
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>

  )
}