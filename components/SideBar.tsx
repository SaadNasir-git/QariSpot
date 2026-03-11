'use client'

import { SidebarCloseIcon, SidebarOpenIcon, EllipsisVertical } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { useLibrary } from '@/contexts/LibraryContext'
import { useRouter } from 'next/navigation'
import Popover from './Popover'
import { handleClosePopover, handleShowPopover } from '@/lib/clientSidefunctions'
import { useAudio } from '@/contexts/AudioContext'

const SideBar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { library } = useLibrary()
  const [activePopoverId, setActivePopoverId] = useState<number | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const { setAudio, audioId } = useAudio()
  const router = useRouter()

  const handleClick = useCallback(
    (item) => {
      if (window.location.search) router.push(window.location.pathname)
      setAudio(item.id)
    },
    [],
  )

  return (
    <aside className={`
      bg-gradient-to-b from-[#0A0A0A] to-[#141414] 
      rounded-2xl transition-all duration-300 ease-in-out 
      h-full hidden md:flex flex-col
      border border-white/5 shadow-2xl
      ${isOpen ? 'w-80' : 'w-20'}
    `}>
      {/* Header Section */}
      <div className={`
        border-b border-white/5 flex-shrink-0
        ${isOpen ? 'p-5' : 'p-4'}
      `}>
        <button
          className={`
            flex items-center gap-3 group w-full
            ${!isOpen && 'justify-center'}
          `}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className={`
            p-2 rounded-xl bg-white/5 group-hover:bg-white/10 
            transition-all duration-200 group-hover:scale-105
          `}>
            {isOpen ? (
              <SidebarCloseIcon className="text-white/70 group-hover:text-white" size={18} />
            ) : (
              <SidebarOpenIcon className="text-white/70 group-hover:text-white" size={18} />
            )}
          </div>

          {isOpen && (
            <>
              <span className="text-white/90 text-sm font-medium tracking-wide flex-1 text-left">
                Your Library
              </span>
              {library.length > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/50 font-medium">
                  {library.length}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Library Items Container - Fix overflow and positioning */}
      <div className="flex-1 relative min-h-0">
        {/* Scrollable area */}
        <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
          <div className="flex flex-col p-2 gap-1">
            {library.map((item, index) => (
              <div
                key={item.id}
                onClick={() => handleClick(item)}
                className={`cursor-pointer
                  group relative flex items-center gap-3 rounded-xl
                  transition-all duration-200 outline-none
                  ${isOpen ? 'p-3' : 'p-3 justify-center'}
                  ${audioId === item.id
                    ? 'bg-gradient-to-r from-green-500/15 to-transparent'
                    : 'hover:bg-white/5'
                  }
                  ${audioId === item.id && isOpen && 'border-l-2 border-green-500'}
                  ${audioId === item.id && !isOpen && 'bg-green-500/15'}
                `}
              >
                {/* Index/Play Indicator - Always visible */}
                <div className="relative flex-shrink-0">
                  {audioId === item.id ? (
                    <div className="relative flex items-center justify-center w-6 h-6">
                      {/* Pulsing background */}
                      <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse" />

                      {/* Play icon */}
                      <div className="relative flex items-center justify-center w-5 h-5 bg-green-500 rounded-full">
                        <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <span className="text-xs font-medium text-white/30 group-hover:text-white/40 transition-colors">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content - Only show when sidebar is open */}
                {isOpen && (
                  <div className="flex-1 min-w-0">
                    <div className='flex justify-between items-center'>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white/90 truncate">
                          {item.name}
                        </h3>
                        {item.qariName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40 font-medium whitespace-nowrap">
                            {item.qariName}
                          </span>
                        )}
                      </div>

                      {/* Popover container */}
                      <div className="relative" ref={activePopoverId === item.id ? popoverRef : undefined}>
                        <button
                          onClick={(e) => handleShowPopover(e, item.id, setActivePopoverId, activePopoverId)}
                          className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer relative z-10"
                          aria-label="Options"
                        >
                          <EllipsisVertical size={16} className="text-white/50 group-hover:text-white/70" />
                        </button>

                        {/* Popover component */}
                        <Popover
                          isOpen={activePopoverId === item.id}
                          audio={item}
                          qari={item.qariName ? { id: item.qariId, name: item.qariName, picUrl: item.url } : null}
                          onClose={() => handleClosePopover(setActivePopoverId)}
                          isLibrary={true}
                        />
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-white/30">Surah</span>
                      {item.durationSeconds && (
                        <>
                          <span className="text-[10px] text-white/20">•</span>
                          <span className="text-[10px] text-white/30">
                            {Math.floor(item.durationSeconds / 60)}:
                            {Math.floor(item.durationSeconds % 60).toString().padStart(2, '0')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Tooltip for collapsed state - Fixed positioning relative to viewport */}
                {!isOpen && (
                  <div className="
                    fixed left-[88px] ml-2 px-2.5 py-1.5 
                    bg-[#1E1E1E] text-xs text-white/90 
                    rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    transition-all duration-200 whitespace-nowrap z-[9999]
                    border border-white/5 shadow-xl
                    pointer-events-none
                  ">
                    {item.name}
                    <span className="text-white/40 ml-1">• {item.qariName}</span>
                  </div>
                )}
              </div>
            ))}

            {/* Empty State */}
            {library.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className={`
                  rounded-2xl bg-white/5 flex items-center justify-center
                  ${isOpen ? 'w-16 h-16 mb-3' : 'w-10 h-10'}
                `}>
                  <svg className={`
                    ${isOpen ? 'w-6 h-6' : 'w-4 h-4'} 
                    text-white/20
                  `} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                {isOpen ? (
                  <>
                    <p className="text-sm text-white/40 font-medium mb-1">Library is empty</p>
                    <p className="text-xs text-white/20 max-w-[180px]">
                      Downloaded surahs will appear here
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-white/20 mt-2 rotate-90 whitespace-nowrap">
                    Empty
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Only show when open and has items */}
      {isOpen && library.length > 0 && (
        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between text-[10px] text-white/20">
            <span>{library.length} {library.length === 1 ? 'item' : 'items'}</span>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 bg-green-500/50 rounded-full"></span>
              offline available
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}

export default SideBar