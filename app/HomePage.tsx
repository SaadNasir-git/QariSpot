'use client'

import Card from "@/components/Card"
import Link from "next/link"
import { use } from "react"

const HomePage = ({ fetchedQaris }: { fetchedQaris: Promise<qari[]> }) => {
    const Qaris = use(fetchedQaris)

    return (
        <div className='grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] gap-2 transition-all duration-500 ease-in-out px-4 sm:px-0'>
            {Qaris.map((qari) => (
                <Link href={qari.id.toString()} className="w-full">
                    <Card QariName={qari.name} imageUrl={qari.picUrl} />
                </Link>
            ))}
        </div>
    )
}

export default HomePage
