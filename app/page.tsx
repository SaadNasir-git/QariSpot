import { CloudAlert } from "lucide-react";
import HomePage from "./HomePage";
import Link from "next/link";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fetchQaris = async () => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/qaris`);
    if (res.ok) {
      const data = (await res.json()).data
      return data
    } else
      return []
  } catch (error) {
    return []
  }
}

const Home = () => {
  let Qaris = fetchQaris()

  if (!navigator.onLine) {
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
    <HomePage fetchedQaris={Qaris} />
  )
}

export default Home
