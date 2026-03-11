'use client'

import Card from "@/components/Card"
import Link from "next/link"
import { use, useEffect, useState } from "react"
import { CloudAlert } from "lucide-react"

const HomePage = ({ fetchedQaris }: { fetchedQaris: Promise<qari[]> }) => {
    const Qaris = use(fetchedQaris)
    const [isOnline, setIsOnline] = useState(true)

    useEffect(() => {
        setIsOnline(navigator.onLine)

        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    if (!isOnline) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 rounded-xl p-6 max-w-md w-full border border-yellow-200 dark:border-yellow-800/50">
                    <div className="flex items-start gap-4">
                        <CloudAlert className="w-8 h-8 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-1" />

                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                You're offline
                            </h3>

                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Connect to the internet to browse new content
                            </p>

                            <Link href={'/playlist'} className="md:hidden w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors duration-200">
                                Go to Playlist →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] gap-2 transition-all duration-500 ease-in-out px-4 sm:px-0'>
            {Qaris.map((qari) => (
                <Link key={qari.id} href={qari.id.toString()} className="w-full flex justify-center">
                    <Card QariName={qari.name} imageUrl={qari.picUrl} />
                </Link>
            ))}
        </div>
    )
}

export default HomePage