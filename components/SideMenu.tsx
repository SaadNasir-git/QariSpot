'use client'

import { EllipsisVertical, X } from 'lucide-react'
import Link from 'next/link';
import { useState } from 'react';

const SideMenu = () => {
    const [isOpen, setisOpen] = useState(false);
    return (
        <>
            <button className='md:hidden mt-2 mr-2 hover:bg-[#1A1A1A] rounded-full w-10 h-10 flex justify-center items-center' onClick={() => setisOpen(true)}>
                <EllipsisVertical className='text-white' />
            </button>
            <div className={`fixed inset-0 w-full h-full bg-black transition-all duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} z-[99999] ease-in-out flex flex-col gap-2 p-4`}>
                <button onClick={() => setisOpen(false)} className='w-full flex items-center h-10 justify-end'>
                    <X className='text-white'/>
                </button>
                <Link onClick={() => setisOpen(false)} href={'/'} className='text-lg w-full h-5 flex justify-center items-center p-10 bg-[#1A1A1A] rounded-2xl'>
                    Home
                </Link>
                <Link onClick={() => setisOpen(false)} href={'/playlist'} className='text-lg w-full h-5 flex justify-center items-center p-10 bg-[#1A1A1A] rounded-2xl'>
                    Playlist
                </Link>
            </div>
        </>
    )
}

export default SideMenu