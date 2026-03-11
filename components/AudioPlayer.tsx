'use client'

import { useAudio } from "@/contexts/AudioContext"
import { AudioWithNeighbors, useLibrary } from "@/contexts/LibraryContext"
import axios from "axios"
import { Howl } from "howler"
import { Pause, Play, RepeatIcon, Volume2, StepBack, StepForward } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

const formatTime = (time: number) => {
  if (!time || isNaN(time)) return '0:00'
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const AudioPlayer = () => {
  const soundRef = useRef<Howl | null>(null)
  const loopRef = useRef<boolean>(false); // Use ref for loop to avoid stale closures in PlayAudio
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  // DOM Refs
  const progressBarInputRef = useRef<HTMLInputElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const currentTimeRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLInputElement>(null)

  const { audioId, setAudio } = useAudio()
  const { getPlaybackUrl, getRecordById } = useLibrary()
  const listenParam = useSearchParams().get('listen')

  const [audioData, setaudioData] = useState<SurahAudioData | AudioWithNeighbors>()
  const [loop, setLoop] = useState<boolean>(false);
  const [isPlaying, setisPlaying] = useState<boolean>(false)
  const [duration, setDuration] = useState<number>(0)

  const updateProgress = useCallback(() => {
    if (soundRef.current) {
      const currentTime = soundRef.current.seek()
      if (progressBarInputRef.current) {
        progressBarInputRef.current.value = currentTime.toString()
      }
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${(soundRef.current.seek() / soundRef.current.duration()) * 100}%`
      }
      if (thumbRef.current) {
        thumbRef.current.style.left = `${(soundRef.current.seek() / soundRef.current.duration()) * 100}%`
      }
      if (currentTimeRef.current) {
        currentTimeRef.current.innerText = formatTime(currentTime)
      }
    }
  }, [])

  const PlayAudio = useCallback((url: string) => {
    if (soundRef.current) {
      soundRef.current.unload()
    }

    soundRef.current = new Howl({
      src: [url],
      autoplay: true,
      html5: true,
      preload: 'metadata',
      format: ['mp3'],
      loop: loopRef.current,
      volume: volumeRef.current?.value ? parseFloat(volumeRef.current.value) : 1,
      onload: () => {
        if (soundRef.current) {
          setDuration(soundRef.current.duration())
          if (progressBarInputRef.current) {
            progressBarInputRef.current.max = soundRef.current.duration().toString()
          }
          updateProgress();
        }
      },
      onplay: () => {
        setisPlaying(true)
        if (progressInterval.current) clearInterval(progressInterval.current)
        progressInterval.current = setInterval(updateProgress, 1000);
      },
      onpause: () => {
        setisPlaying(false)
        if (progressInterval.current) clearInterval(progressInterval.current)
      },
      onend: () => {
        setisPlaying(false)
        if (progressInterval.current) clearInterval(progressInterval.current)
        // Optional: Auto-next logic could go here if needed
      },
      onstop: () => {
        setisPlaying(false)
        if (progressInterval.current) clearInterval(progressInterval.current)
      }
    })
  }, [updateProgress])

  useEffect(() => {
    const fetchAndPlay = async () => {
      if (audioId && typeof audioId === 'string') {
        PlayAudio(`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/v1/${audioId}.mp3`)

        // Fetch metadata
        try {
          const res = await axios.post('/api/surahdata', { url: audioId })
          setaudioData(res.data.data);
        } catch (e) {
          console.error("Failed to fetch surah data", e)
        }

      } else if (audioId && typeof audioId === 'number') {
        const PlaybackUrl = getPlaybackUrl(audioId)
        if (!PlaybackUrl) return

        setaudioData(getRecordById(audioId))
        PlayAudio(PlaybackUrl)

      } else if (listenParam) {
        setAudio(listenParam)
      }
    }

    fetchAndPlay()

    // CLEANUP: Unload sound on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unload();
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }
  }, [listenParam, audioId, PlayAudio, getPlaybackUrl, getRecordById, setAudio])

  const toggleLoop = useCallback(() => {
    const newLoopState = !loop
    setLoop(newLoopState)
    loopRef.current = newLoopState
    if (soundRef.current) {
      soundRef.current.loop(newLoopState)
    }
  }, [loop])

  const togglePlay = useCallback(() => {
    if (soundRef.current) {
      if (isPlaying) {
        soundRef.current.pause()
      } else {
        soundRef.current.play()
      }
    }
  }, [isPlaying])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value)
    if (soundRef.current) {
      soundRef.current.seek(seekTime)
      updateProgress()
    }
  }, [updateProgress])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (soundRef.current) {
      soundRef.current.volume(parseFloat(e.target.value))
    }
  }, [])

  const updateMediaSession = useCallback((track: any) => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Surah ${track.name}` || 'Unknown Surah',
        artist: track.qariName || 'Unknown Qari',
        album: 'QariSpot',
        artwork: [
          { src: '/quran.png', sizes: '512x512', type: 'image/png' },
        ]
      });
    }
  }, [])
  
  const handlePreviousClick = useCallback(() => {
    if (!audioData?.previous_surah) return
    updateMediaSession(audioData.previous_surah);

    if (typeof audioId === 'number') setAudio(audioData.previous_surah.id)
    else if (typeof audioId === 'string') setAudio(audioData.previous_surah.url)
    
  }, [audioData, audioId, setAudio, updateMediaSession])

  const handleNextClick = useCallback(() => {
    if (!audioData?.next_surah) return
    updateMediaSession(audioData.next_surah);

    if (typeof audioId === 'number') setAudio(audioData.next_surah.id)
    else if (typeof audioId === 'string') setAudio(audioData.next_surah.url)
    
  }, [audioData, audioId, setAudio, updateMediaSession])

  useEffect(() => {
    if (!audioData || typeof navigator === 'undefined') return;

    if ('mediaSession' in navigator) {
      updateMediaSession(audioData.current);
      const setAction = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch (e) { /* Browser might not support this action */ }
      }

      setAction('play', () => soundRef.current?.play());
      setAction('pause', () => soundRef.current?.pause());
      setAction('stop', () => soundRef.current?.stop());
      
      setAction('seekto', (details) => {
        if (soundRef.current && details.seekTime !== undefined) {
          soundRef.current.seek(details.seekTime);
          updateProgress();
        }
      });

      setAction('previoustrack', audioData.previous_surah ? handlePreviousClick : null);
      setAction('nexttrack', audioData.next_surah ? handleNextClick : null);
    }
  }, [audioData, handlePreviousClick, handleNextClick, updateProgress, updateMediaSession]);
  
  return (
    <div className={`${soundRef.current ? 'h-28' : 'h-0'} md:px-4 transition-all dark ease-in-out`}>
      {soundRef.current && (
        <div className="h-full">
          <div className="w-full flex justify-center items-center h-full">

            {/* Text Content - Added Safe Navigation */}
            <div className="md:flex hidden gap-1 flex-col w-80 overflow-clip">
              <div className="items-center gap-2 w-min flex">
                <h4 className="text-sm font-medium text-white">
                  <span dir="rtl" className="inline-block align-middle truncate">{audioData?.current?.name}</span>
                </h4>
                <span className="text-white/30">•</span>
                <span className="text-sm text-white/70 truncate">{audioData?.current?.qariName}</span>
              </div>
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${audioId && typeof (audioId) === 'number'
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                  : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${audioId && typeof (audioId) === "number" ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                  {audioId && typeof (audioId) === 'number' ? 'Offline Mode' : 'Streaming'}
                </span>
              </div>
            </div>

            <div className="w-full flex flex-col md:px-2 px-2 pt-4 pb-2">

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <div className="w-full"></div>

                {/* Center Controls */}
                <div className="w-full flex justify-center items-center gap-6">
                  <button
                    onClick={handlePreviousClick}
                    disabled={!audioData?.previous_surah}
                    className={`group relative p-2 rounded-full transition-all duration-300 ${audioData?.previous_surah ? 'text-white/80 hover:text-white hover:scale-110 active:scale-95 cursor-pointer' : 'text-white/30 cursor-not-allowed'}`}
                  >
                    <StepBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="group relative w-14 h-14 rounded-full transition-all duration-300 bg-white text-black hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </button>

                  <button
                    onClick={handleNextClick}
                    disabled={!audioData?.next_surah}
                    className={`group relative p-2 rounded-full transition-all duration-300 ${audioData?.next_surah ? 'text-white/80 hover:text-white hover:scale-110 active:scale-95 cursor-pointer' : 'text-white/30 cursor-not-allowed'}`}
                  >
                    <StepForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Right Controls */}
                <div className="flex gap-3 h-10 w-full justify-end items-center pr-1">
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

              {/* Progress Bar - Fixed Layout */}
              <div className="flex items-center gap-2 w-full py-2">
                <span className="text-xs text-white/40 w-10 text-right" ref={currentTimeRef}>0:00</span>

                <div className="flex-1 relative h-4 flex items-center group">
                  {/* Background Track */}
                  <div className="absolute w-full h-1 bg-white/10 rounded-full pointer-events-none" />

                  {/* Active Progress Fill */}
                  <div
                    className="absolute h-1 bg-gradient-to-r from-green-500 to-green-400 rounded-full pointer-events-none"
                    ref={progressBarRef}
                  />

                  {/* The Input (Invisible but clickable) */}
                  <input
                    ref={progressBarInputRef}
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    onChange={handleSeek}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                    style={{
                      zIndex: 10
                    }}
                  />
                    <div
                      className="absolute w-4 h-4 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] 
                   border-2 border-white opacity-100 transition-all 
                   duration-200 pointer-events-none z-20 hover:scale-110"
                      ref={thumbRef}
                      style={{
                        transform: 'translateX(-50%)',
                        top: '50%',
                        marginTop: '-8px'
                      }}
                    />
                </div>

                <span className="text-xs text-white/40 w-10">{formatTime(duration)}</span>
              </div>

            </div>
          </div>
        </div>)}
    </div>
  )
}

export default AudioPlayer
