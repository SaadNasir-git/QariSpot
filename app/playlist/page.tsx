'use client'

import { EllipsisVertical, Music, Clock, User, Library, Download } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { useLibrary } from '@/contexts/LibraryContext'
import Popover from '@/components/Popover'
import { handleClosePopover, handleShowPopover } from '@/lib/clientSidefunctions'
import { useRouter } from 'next/navigation'
import { useAudio } from '@/contexts/AudioContext'

const PlaylistPage = () => {
    const { library } = useLibrary()
    const [activePopoverId, setActivePopoverId] = useState<number | null>(null)
    const popoverRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const { setAudio, audioId } = useAudio()

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleClick = useCallback((item) => {
        if (window.location.search) router.push(window.location.pathname)
        setAudio(item.id)
    }, [],
    )


    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-[#0A0A0A] to-[#141414] shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20">
                        <Library className="w-5 h-5 text-white/70" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white/90">Your Library</h2>
                        <p className="text-xs text-white/40">
                            {library.length} {library.length === 1 ? 'item' : 'items'} • Offline available
                        </p>
                    </div>
                </div>
            </div>

            {/* Library Items Container */}
            <div className="flex-1 relative min-h-0">
                <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
                    <div className="flex flex-col p-3 gap-1">
                        {library.map((item, index) => (
                            <div
                                key={item.id}
                                onClick={() => handleClick(item)}
                                className={`
                                    group relative flex items-center gap-4 rounded-xl p-3
                                    transition-all duration-200 outline-none cursor-pointer
                                    ${audioId === item.id
                                        ? 'bg-gradient-to-r from-green-500/15 via-green-500/5 to-transparent border-l-2 border-green-500'
                                        : 'hover:bg-white/5'
                                    }
                                `}
                            >
                                {/* Index/Play Indicator */}
                                <div className="relative flex-shrink-0 w-8">
                                    {audioId === item.id ? (
                                        <div className="relative flex items-center justify-center w-8 h-8">
                                            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                                            <div className="absolute inset-0 bg-green-500/30 rounded-full animate-pulse" />
                                            <div className="relative flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
                                                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-black border-b-[6px] border-b-transparent ml-0.5" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 flex items-center justify-center">
                                            <span className="text-sm font-medium text-white/30 group-hover:text-white/50 transition-colors">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-sm font-medium text-white/90 truncate">
                                                    {item.name}
                                                </h3>
                                                {item.qariName && (
                                                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-medium whitespace-nowrap">
                                                        <User size={8} />
                                                        {item.qariName}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex items-center gap-3 text-[10px] text-white/30">
                                                <span className="flex items-center gap-1">
                                                    <Music size={10} />
                                                    Surah
                                                </span>
                                                {item.durationSeconds && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {formatDuration(item.durationSeconds)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Options Button */}
                                        <div className="relative" ref={activePopoverId === item.id ? popoverRef : undefined}>
                                            <button
                                                onClick={(e) => handleShowPopover(e, item.id, setActivePopoverId, activePopoverId)}
                                                className={`
                                                    p-1.5 rounded-lg transition-all duration-200
                                                    ${activePopoverId === item.id
                                                        ? 'bg-white/20 text-white'
                                                        : 'hover:bg-white/10 text-white/50 hover:text-white/70'
                                                    }
                                                `}
                                                aria-label="Options"
                                            >
                                                <EllipsisVertical size={18} />
                                            </button>

                                            <Popover
                                                isOpen={activePopoverId === item.id}
                                                audio={item}
                                                qari={item.qariName ? {
                                                    id: item.qariId,
                                                    name: item.qariName,
                                                    picUrl: item.url
                                                } : null}
                                                onClose={() => handleClosePopover(setActivePopoverId)}
                                                isLibrary={true}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Empty State */}
                        {library.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center border border-white/5">
                                    <Download className="w-8 h-8 text-white/20" />
                                </div>
                                <h3 className="text-base font-medium text-white/70 mb-2">Your library is empty</h3>
                                <p className="text-sm text-white/30 max-w-[220px]">
                                    Download your favorite surahs to access them offline anytime
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Stats */}
            {library.length > 0 && (
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                                <Music size={12} />
                                <span>{library.length} tracks</span>
                            </div>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                                <Clock size={12} />
                                <span>
                                    {formatDuration(library.reduce((acc, item) => acc + (item.durationSeconds || 0), 0))} total
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] text-white/30">Offline</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PlaylistPage