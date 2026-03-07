'use client'

import { EllipsisVertical } from "lucide-react"
import { useState, useRef, useCallback, useEffect } from "react"
import Popover from "./Popover"
import { handleClosePopover, handleShowPopover } from "@/lib/clientSidefunctions"
import { useRouter } from "next/navigation"
import { useAudio } from "@/contexts/AudioContext"

const AudioCard = ({ audio, qari }: { audio: surah, qari: qari }) => {
  const [activePopoverId, setActivePopoverId] = useState<number | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { setAudio, audioId } = useAudio()

  const handleClick = useCallback(() => {
    if (window.location.search) router.push(window.location.pathname)
    setAudio(audio.url.replace('media-manager/audio-manager/', ''))
  }, [],
  )

  return (
    <div
      onClick={handleClick}
      id={audio.url}
      className={`
    w-full h-20 rounded-lg transition-all duration-300 ease-in-out 
    flex justify-between items-center md:p-5 p-2 group cursor-pointer
    ${audioId === audio.url.replace('media-manager/audio-manager/', '')
          ? 'bg-gradient-to-r from-green-500/15 to-transparent border-l-2 border-green-500'
          : 'hover:bg-[#1d1d1d]'
        }
  `}
    >
      <div className='flex justify-center items-center gap-5'>
        {/* Play/Index Indicator */}
        <div className="relative flex-shrink-0">
          {audioId === audio.url.replace('media-manager/audio-manager/', '') ? (
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
              <span className="text-xs font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                {String(audio.surahNo).padStart(3, '0')}
              </span>
            </div>
          )}
        </div>

        <span className={`
      font-bold transition-colors
      ${audioId === audio.url.replace('media-manager/audio-manager/', '')
            ? 'text-green-500'
            : 'text-green-500 group-hover:text-green-400'
          }
    `}>
          Surah {audio.name}
        </span>
      </div>

      <div className="relative" ref={popoverRef}>
        <button
          onClick={(e) => handleShowPopover(e, audio.id, setActivePopoverId, activePopoverId)}
          className="h-10 cursor-pointer relative z-10 p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Options"
        >
          <EllipsisVertical size={20} className="text-gray-400 group-hover:text-gray-300" />
        </button>
        <Popover
          isOpen={activePopoverId === audio.id}
          audio={audio}
          qari={qari}
          onClose={() => handleClosePopover(setActivePopoverId)}
        />
      </div>
    </div>
  )
}

export default AudioCard
