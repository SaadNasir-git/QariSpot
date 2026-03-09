'use client'

import { useAudio } from "@/contexts/AudioContext"
import { useLibrary } from "@/contexts/LibraryContext"
import { handleAddToLibrary, handleDownload } from "@/lib/clientSidefunctions"
import axios from "axios"
import { Howl } from "howler"
import { Bookmark, Check, Download, Loader2, Pause, Play, RepeatIcon, Volume2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import React, { useCallback, useEffect, useRef, useState } from "react"

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const AudioPlayer = () => {
  const soundRef = useRef<Howl | null>(null)
  const { audioId, setAudio } = useAudio()
  const { getPlaybackUrl, getRecordById } = useLibrary()
  const listenParam = useSearchParams().get('listen')
  const [audioData, setaudioData] = useState<surah & { qariName: string }>()
  const [loop, setLoop] = useState<boolean>(false);
  const [isPlaying, setisPlaying] = useState<boolean>(false)
  const [duration, setDuration] = useState<number>(0)
  const [progressBarInputRef, progressBarRef, currentTimeRef, volumeRef, progressInterval] = [useRef<HTMLInputElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLInputElement>(null), useRef<NodeJS.Timeout>(null)]

  const updateProgress = useCallback(() => {
    if (soundRef.current) {
      const currentTime = soundRef.current.seek()
      if (progressBarInputRef.current) {
        progressBarInputRef.current.value = currentTime.toString()
      }
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${(soundRef.current.seek() / soundRef.current.duration()) * 100}%`
      }
      if (currentTimeRef.current) {
        currentTimeRef.current.innerText = formatTime(currentTime)
      }
    }
  }, [])

  const PlayAudio = useCallback((url: string) => {
    if (soundRef.current)
      soundRef.current.unload()

    soundRef.current = new Howl({
      src: [url],
      autoplay: true,
      html5: true,
      preload: 'metadata',
      loop: loop,
      volume: volumeRef.current?.value ? parseFloat(volumeRef.current.value) : volumeRef.current?.defaultValue ? parseFloat(volumeRef.current.defaultValue) : 1,
      onload: () => {
        if (soundRef.current) {
          setDuration(soundRef.current.duration())
          if (progressBarInputRef.current) {
            progressBarInputRef.current.max = soundRef.current.duration().toString()
          }
          if (progressBarRef.current) {
            progressBarRef.current.style.width = `${(soundRef.current.seek() / soundRef.current.duration()) * 100}%`
          }
          if (currentTimeRef.current) {
            currentTimeRef.current.innerText = formatTime(soundRef.current.seek())
          }
          if (progressInterval.current) {
            clearInterval(progressInterval.current)
          }
        }
      },
      onplay: () => {
        setisPlaying(true)
        progressInterval.current = setInterval(updateProgress, 1000);
      },
      onpause: () => {
        setisPlaying(false)
        if (progressInterval.current) {
          clearInterval(progressInterval.current)
        }
      },
      onend: () => {
        setisPlaying(false)
        if (progressInterval.current) {
          clearInterval(progressInterval.current)
        }
      },
      onstop: () => {
        setisPlaying(false)
        if (progressInterval.current) {
          clearInterval(progressInterval.current)
        }
      }
    })
    if (duration === 0 && soundRef.current) {
      setDuration(soundRef.current.duration())
    }
  }, [])

  const initialFunction = useCallback(async () => {
    if (audioId && typeof audioId === 'string') {
      PlayAudio(`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/v1/${audioId}.mp3`)
      const res = await axios.post('/api/surahdata', { url: audioId })
      setaudioData(res.data.data);
    } else if (audioId && typeof audioId === 'number') {
      const PlaybackUrl = getPlaybackUrl(audioId)
      setaudioData(getRecordById(audioId))
      PlayAudio(PlaybackUrl)
    } else if (listenParam) {
      setAudio(listenParam)
    }
  }, [listenParam, audioId])

  useEffect(() => {
    initialFunction()
  }, [initialFunction])

  const toggleLoop = () => {
    const newLoopState = !loop
    setLoop(newLoopState)
    if (soundRef.current) {
      soundRef.current.loop(newLoopState)
    }
  }

  const togglePlay = () => {
    if (soundRef.current) {
      if (isPlaying) {
        soundRef.current.pause()
      } else {
        soundRef.current.play()
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value)
    if (soundRef.current) {
      soundRef.current.seek(seekTime)
      updateProgress()
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (soundRef.current) {
      soundRef.current.volume(parseFloat(e.target.value))
    }
  }

  return (
    <div className={`${soundRef.current ? 'h-28' : 'h-0'} md:px-4 transition-all dark ease-in-out`}>
      {soundRef.current && (
        <div>
          <div className="w-full flex justify-center items-center h-full">
            {/* Text Content */}
            <div className="md:flex hidden gap-1 flex-col">
              {/*Info of audio*/}
              <div className="items-center gap-2 w-min flex">
                <h4 className="text-sm font-medium text-white">
                  <span dir="rtl" className="inline-block align-middle truncate">{audioData?.name}</span>
                </h4>
                <span className="text-white/30">•</span>
                <span className="text-sm text-white/70 truncate">{audioData?.qariName}</span>
              </div>
              {/* Status Badge */}
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${audioId && typeof (audioId) === 'number'
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                  : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${audioId && typeof (audioId) === "number" ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}></span>
                  {audioId && typeof (audioId) === 'number' ? 'Offline Mode' : 'Streaming'}
                </span>
              </div>

            </div>

            <div className="w-full flex flex-col md:px-2 px-2 pt-4 pb-2">

              {/*Action Buttons*/}
              <div className="flex justify-between">
                {/*LibraryAndDownloadButtons*/}
                <LibraryAndDownloadButtons audioData={audioData} />

                {/*Play and Pause Button*/}
                <button
                  onClick={togglePlay}
                  className="p-3 bg-white hover:bg-white/90 rounded-full transition-all hover:scale-105 shadow-lg"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-black" />
                  ) : (
                    <Play className="w-5 h-5 text-black" />
                  )}
                </button>

                {/*Volume control and repeat buttons*/}
                <div className="flex gap-3 h-10 w-full justify-end items-center">
                  <button
                    className={`${loop ? 'opacity-100 bg-[#1A1A1A]' : 'opacity-50'} hover:opacity-70 hover:bg-[#1A1A1A] transition-all duration-300 rounded-full w-8 flex justify-center items-center h-8`}
                    onClick={toggleLoop}
                  >
                    <RepeatIcon className="h-5 text-white" />
                  </button>
                  <div className="lg:flex hidden items-center gap-2 ml-2 group/volume">
                    <Volume2 className="w-4 h-4 text-white/40 group-hover/volume:text-white/60" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      defaultValue={1}
                      ref={volumeRef}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                  </div>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs text-white/40 w-8 text-right" ref={currentTimeRef}>
                  {/* {formatTime(soundRef.current.seek())} */}
                  00:00
                </span>
                <div className="flex-1 relative group">
                  <input
                    ref={progressBarInputRef}
                    type="range"
                    min={0}
                    onChange={handleSeek}
                    className="w-full h-[1px] bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:group-hover:opacity-100 [&::-webkit-slider-thumb]:transition-opacity"
                  />
                  <div
                    className="absolute top-3 left-0 h-1 bg-gradient-to-r from-green-500 to-green-400 rounded-full pointer-events-none"
                    ref={progressBarRef}
                  />
                </div>
                <span className="text-xs text-white/40 w-8">
                  {formatTime(duration)}
                </span>
              </div>

            </div>
          </div >
        </div>)}

    </div >
  )
}

let isAudioInLibrary: boolean;

const LibraryAndDownloadButtons = ({ audioData }: { audioData: surah & { qariName: string } | undefined }) => {
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed'>('idle')
  const [libraryState, setLibraryState] = useState<'idle' | 'downloading' | 'completed'>('idle')
  const { isInLibrary, addToLibrary } = useLibrary()
  if (audioData) {
    isAudioInLibrary = isInLibrary(audioData?.id)
  }
  return (
    <div className="w-full">
      {audioData ? (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              if (libraryState !== 'downloading' && !isAudioInLibrary) {
                handleAddToLibrary({
                  e,
                  audio: audioData,
                  libraryState,
                  setLibraryState,
                  qari: { id: audioData.qariId, name: audioData.qariName },
                  isInLibrary,
                  addToLibrary
                })
              }
            }}
            disabled={libraryState === 'downloading' || isAudioInLibrary}
            className="opacity-50 hover:opacity-70 hover:bg-[#1A1A1A] transition-all duration-300 rounded-full w-8 flex justify-center items-center h-8 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {libraryState === 'downloading' ? (
              <Loader2 className="h-5 animate-spin" />
            ) : isAudioInLibrary ? (
              <Check className="h-5 text-green-500" />
            ) : (
              <Bookmark className="h-5 text-white" />
            )}
          </button>
          {/* Download Button */}
          <button
            onClick={(e) => {
              if (downloadState !== 'downloading') {
                handleDownload(e, downloadState, setDownloadState, audioData)
              }
            }}
            disabled={downloadState === 'downloading'}
            className="opacity-50 hover:opacity-70 hover:bg-[#1A1A1A] transition-all duration-300 rounded-full w-8 flex justify-center items-center h-8 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {downloadState === 'downloading' ? (
              <Loader2 className="h-5 animate-spin" />
            ) : downloadState === 'completed' ? (
              <Check className="h-5 text-green-500" />
            ) : (
              <Download className="h-5 text-white" />
            )}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button>
            <Loader2 className="h-5 animate-spin" />
          </button>
          <button>
            <Loader2 className="h-5 animate-spin" />
          </button>
        </div>
      )}
    </div>
  )
}

export default AudioPlayer

// 'use client'

// import { useSearchParams } from "next/navigation"
// import { useCallback, useEffect, useRef, useState } from "react";
// import { Howl } from "howler";
// import {
//   Play,
//   Pause,
//   Bookmark,
//   Download,
//   Volume2,
//   RepeatIcon,
//   Loader2,
//   Check
// } from 'lucide-react';
// import { useLibrary } from "@/contexts/LibraryContext";
// import axios from "axios";
// import { handleAddToLibrary, handleDownload } from "@/lib/clientSidefunctions";
// import { useAudio } from "@/contexts/AudioContext";

// const AudioPlayer = () => {
//   const [url, setUrl] = useState<string>('')
//   const [isPlaying, setIsPlaying] = useState(false)
//   const [currentTime, setCurrentTime] = useState(0)
//   const [duration, setDuration] = useState(0)
//   const [volume, setVolume] = useState(1)
//   const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed'>('idle')
// const [libraryState, setLibraryState] = useState<'idle' | 'downloading' | 'completed'>('idle')
//   const [downloadProgress, setDownloadProgress] = useState(0)
//   const soundRef = useRef<Howl | null>(null)
//   const searchParams = useSearchParams();
//   const listenParam = searchParams.get('listen')
//   const progressInterval = useRef<NodeJS.Timeout>(null)
//   const [loop, setLoop] = useState<boolean>(false)
//   const { getPlaybackUrl, getRecordById, isInLibrary, addToLibrary } = useLibrary()
//   const [audioData, setaudioData] = useState<surah & { qariName: string }>();
//   const { audioId, setAudio } = useAudio()

//   const isAudioInLibrary = isInLibrary(audioData?.id)

//   const PlayOnline = useCallback(async (Params: string) => {
//     setUrl(Params)
//     const res = await axios.post('/api/surahdata', { url: Params })
//     setaudioData(res.data.data)

//     if (soundRef.current) {
//       soundRef.current.unload()
//     }

//     soundRef.current = new Howl({
//       src: [`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/v1/${Params}.mp3`],
//       html5: true,
//       preload: 'metadata',
//       autoplay: true,
//       loop: loop,
//       onload: () => {
//         setDuration(soundRef.current?.duration() || 0)
//       },
//       onplay: () => {
//         setIsPlaying(true)
//         progressInterval.current = setInterval(() => {
//             setCurrentTime(soundRef.current?.seek() || 0)
//         }, 1000)
//       },
//       onpause: () => {
//         setIsPlaying(false)
//         clearInterval(progressInterval.current)
//       },
//       onend: () => {
//         setIsPlaying(false)
//         setCurrentTime(0)
//         clearInterval(progressInterval.current)
//       },
//       onstop: () => {
//         setIsPlaying(false)
//         setCurrentTime(0)
//         clearInterval(progressInterval.current)
//       }
//     })
//   }, [],
//   )

//   const initialFunction = useCallback(async () => {

//     if (audioId && typeof audioId === 'string') {
//       PlayOnline(audioId)

//     } else if (audioId && typeof audioId === 'number') {

//       const PlaybackUrl = getPlaybackUrl(audioId)
//       setUrl(PlaybackUrl)
//       setaudioData(getRecordById(audioId))
//       if (!PlaybackUrl) return

//       // Unload previous sound if exists
//       if (soundRef.current) {
//         soundRef.current.unload()
//       }

//       soundRef.current = new Howl({
//         src: [PlaybackUrl],
//         html5: true,
//         preload: 'metadata',
//         format: ['mp3'],
//         autoplay: true,
//         loop: loop,
//         onload: () => {
//           setDuration(soundRef.current?.duration() || 0)
//         },
//         onplay: () => {
//           setIsPlaying(true)
//           progressInterval.current = setInterval(() => {
//             setCurrentTime(soundRef.current?.seek() || 0)
//           }, 1000)
//         },
//         onpause: () => {
//           setIsPlaying(false)
//           clearInterval(progressInterval.current)
//         },
//         onend: () => {
//           setIsPlaying(false)
//           setCurrentTime(0)
//           clearInterval(progressInterval.current)
//         },
//         onstop: () => {
//           setIsPlaying(false)
//           setCurrentTime(0)
//           clearInterval(progressInterval.current)
//         }
//       })
//     } else if (listenParam) {
//       setAudio(listenParam)

//     } 
//   }, [listenParam, audioId, getPlaybackUrl, getRecordById])

//   useEffect(() => {
//     initialFunction()
//     return () => {
//       if (progressInterval.current) {
//         clearInterval(progressInterval.current)
//       }
//       if (soundRef.current) {
//         soundRef.current.unload()
//       }
//     }
//   }, [initialFunction])

// const togglePlay = () => {
//   if (soundRef.current) {
//     if (isPlaying) {
//       soundRef.current.pause()
//     } else {
//       soundRef.current.play()
//     }
//   }
// }

// const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
//   const seekTime = parseFloat(e.target.value)
//   setCurrentTime(seekTime)
//   if (soundRef.current) {
//     soundRef.current.seek(seekTime)
//   }
// }

// const formatTime = (time: number) => {
//   const minutes = Math.floor(time / 60)
//   const seconds = Math.floor(time % 60)
//   return `${minutes}:${seconds.toString().padStart(2, '0')}`
// }

//   const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const newVolume = parseFloat(e.target.value)
//     setVolume(newVolume)
//     if (soundRef.current) {
//       soundRef.current.volume(newVolume)
//     }
//   }

// const toggleLoop = () => {
//   const newLoopState = !loop
//   setLoop(newLoopState)
//   if (soundRef.current) {
//     soundRef.current.loop(newLoopState)
//   }
// }

// const closePlayer = () => {
//   if (soundRef.current) {
//     soundRef.current.unload()
//   }
//   setUrl('')
// }

// if (!url && audioData) return null;

//   return (
//     <div className={`${url ? 'h-28' : 'h-0'} transition-all dark ease-in-out`}>
//       {url && (
//         <div className="max-w-7xl mx-auto px-4 py-3">
//           <div className="flex items-center gap-4">
//             {/* Track Info */}
//             <div className="md:flex items-center gap-3 min-w-0 flex-1 md:flex-none lg:w-72 hidden">
//               {/* Icon Container */}
//               <div className="relative w-12 h-12 flex-shrink-0">
//                 <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg opacity-20"></div>
//                 <div className="relative w-full h-full flex items-center justify-center">
//                   <Volume2 className="w-5 h-5 text-emerald-400" />
//                 </div>
//               </div>

// {/* Text Content */}
// <div className="min-w-0 flex-1">
//   <div className="flex items-center gap-2">
//     <h4 className="text-sm font-medium text-white truncate">
//       <span dir="rtl" className="inline-block align-middle">{audioData?.name}</span>
//     </h4>
//     <span className="text-white/30">•</span>
//     <span className="text-sm text-white/70 truncate">{audioData?.qariName}</span>
//   </div>

//                 {/* Status Badge */}
//                 <div className="mt-1">
//                   <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${audioId && typeof (audioId) === 'number' && !listenParam
//                     ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
//                     : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
//                     }`}>
//                     <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${audioId && typeof (audioId) === "number" ? 'bg-amber-400' : 'bg-emerald-400'
//                       }`}></span>
//                     {audioId && typeof (audioId) === 'number' && !listenParam ? 'Offline Mode' : 'Streaming'}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* Player Controls - Center */}
//             <div className="items-center flex flex-col justify-center pt-2 w-full">
//               {/* Playback Controls */}
//               <div className="flex justify-between w-full items-center mb-2 px-2">
//                 <div className="flex gap-2 w-full">
//                   {/* Add to Library Button */}
//                   <button
//                     onClick={(e) => {
//                       if (libraryState !== 'downloading' && !isAudioInLibrary) {
//                         handleAddToLibrary(
//                           e,
//                           audioData,
//                           libraryState,
//                           setLibraryState,
//                           setDownloadProgress,
//                           { id: audioData.qariId, name: audioData.qariName },
//                           isInLibrary,
//                           addToLibrary
//                         )
//                       }
//                     }}
//                     disabled={libraryState === 'downloading' || isAudioInLibrary}
//                     className="opacity-50 hover:opacity-70 hover:bg-[#1A1A1A] transition-all duration-300 rounded-full w-8 flex justify-center items-center h-8 disabled:opacity-30 disabled:cursor-not-allowed"
//                   >
//                     {libraryState === 'downloading' ? (
//                       <Loader2 className="h-5 animate-spin" />
//                     ) : isAudioInLibrary ? (
//                       <Check className="h-5 text-green-500" />
//                     ) : (
//                       <Bookmark className="h-5 text-white" />
//                     )}
//                   </button>

//                   {/* Download Button */}
//                   <button
//                     onClick={(e) => {
//                       if (downloadState !== 'downloading') {
//                         handleDownload(e, downloadState, setDownloadState, audioData)
//                       }
//                     }}
//                     disabled={downloadState === 'downloading'}
//                     className="opacity-50 hover:opacity-70 hover:bg-[#1A1A1A] transition-all duration-300 rounded-full w-8 flex justify-center items-center h-8 disabled:opacity-30 disabled:cursor-not-allowed"
//                   >
//                     {downloadState === 'downloading' ? (
//                       <Loader2 className="h-5 animate-spin" />
//                     ) : downloadState === 'completed' ? (
//                       <Check className="h-5 text-green-500" />
//                     ) : (
//                       <Download className="h-5 text-white" />
//                     )}
//                   </button>
//                 </div>

//                 <button
//                   onClick={togglePlay}
//                   className="p-3 bg-white hover:bg-white/90 rounded-full transition-all hover:scale-105 shadow-lg"
//                 >
//                   {isPlaying ? (
//                     <Pause className="w-5 h-5 text-black" />
//                   ) : (
//                     <Play className="w-5 h-5 text-black" />
//                   )}
//                 </button>

//                 {/*  */}
//                 <div className="flex justify-self-end-safe items-center gap-2 w-full justify-end">
//                   {/* Repeat Button */}
//                   <div>
//                     <button
//                       className={`${loop ? 'opacity-100 bg-[#1A1A1A]' : 'opacity-50'} hover:opacity-70 hover:bg-[#1A1A1A] transition-all duration-300 rounded-full w-8 flex justify-center items-center h-8`}
//                       onClick={toggleLoop}
//                     >
//                       <RepeatIcon className="h-5 text-white" />
//                     </button>
//                   </div>

//                   {/* Volume Control */}
//                   <div className="lg:flex hidden items-center gap-2 ml-2 group/volume">
//                     <Volume2 className="w-4 h-4 text-white/40 group-hover/volume:text-white/60" />
//                     <input
//                       type="range"
//                       min={0}
//                       max={1}
//                       step={0.01}
//                       value={volume}
//                       onChange={handleVolumeChange}
//                       className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* Progress Bar */}
//               <div className="flex items-center gap-2 w-full">
//                 <span className="text-xs text-white/40 w-10 text-right">
//                   {formatTime(currentTime)}
//                 </span>
//                 <div className="flex-1 relative group">
//                   <input
//                     type="range"
//                     min={0}
//                     max={duration}
//                     value={currentTime}
//                     onChange={handleSeek}
//                     className="w-full h-[1px] bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:group-hover:opacity-100 [&::-webkit-slider-thumb]:transition-opacity"
//                   />
//                   <div
//                     className="absolute top-3 left-0 h-1 bg-gradient-to-r from-green-500 to-green-400 rounded-full pointer-events-none"
//                     style={{ width: `${(currentTime / duration) * 100}%` }}
//                   />
//                 </div>
//                 <span className="text-xs text-white/40 w-10">
//                   {formatTime(duration)}
//                 </span>
//               </div>
//             </div>

//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// export default AudioPlayer

