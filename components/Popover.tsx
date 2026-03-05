import { useLibrary } from "@/contexts/LibraryContext"
import { handleAddToLibrary, handleDownload } from "@/lib/clientSidefunctions"
import { ArrowDownCircle, Check, Download, Link2, Loader2, PlusCircle, Share2, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState, MouseEvent, RefObject } from "react"

const SharePopup = ({ audio, qari, onClose }: { audio: surah, qari: qari, onClose: () => void }) => {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${window.location.origin}/${qari.id}?listen=${audio.url.replace('media-manager/audio-manager/', '')}`
  const shareText = `Listen to Surah ${audio.name} by Qari ${qari.name}`

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      try {
        const strayLinks = document.querySelectorAll('a[download]');
        strayLinks.forEach(link => {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
        });
      } catch (error) {
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownloadLink = () => {
    try {

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const cleanFileName = `Surah_${audio.name.replace(/[^\w]|\/|\\/g, "_")}`;
      const downloadUrl = `https://res.cloudinary.com/${cloudName}/video/upload/fl_attachment:${cleanFileName}/v1/${audio.url}.mp3`;

      // Method 1: Safe DOM manipulation
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${cleanFileName}.mp3`;
      link.target = '_blank';
      link.style.display = 'none';

      // Ensure it's not already in the DOM
      if (!document.body.contains(link)) {
        document.body.appendChild(link);
      }

      link.click();

      // Safe removal with timeout
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 100);

      onClose();
    } catch (error) {
    }
  }

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`
    window.open(whatsappUrl, '_blank')
    onClose()
  }

  const handleInstagramShare = () => {
    navigator.clipboard.writeText(shareUrl)
    alert('Link copied! You can now paste it in Instagram stories or bio.')
    onClose()
  }

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(twitterUrl, '_blank')
    onClose()
  }

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(facebookUrl, '_blank')
    onClose()
  }

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    window.open(telegramUrl, '_blank')
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.target != modalRef.current) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-[#1A1A1A] rounded-xl border border-white/10 p-4 w-[90%] max-w-md shadow-2xl"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-white">Share Surah</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-2">Surah {audio.name} by {qari.name}</p>

        {/* URL Copy Section */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-[#121212] border border-white/10 rounded-lg px-3 py-2 w-28">
            <p className="text-xs text-gray-300 line-clamp-1">{shareUrl}</p>
          </div>
          <button
            onClick={handleCopy}
            className="p-2 bg-[#121212] hover:bg-white/10 border border-white/10 rounded-lg transition-colors group"
            title="Copy link"
          >
            {copied ? (
              <Check size={16} className="text-green-500" />
            ) : (
              <Link2 size={16} className="text-gray-400 group-hover:text-white" />
            )}
          </button>
        </div>

        {/* Social Media Icons */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Share via</p>
          <div className="flex items-center gap-3 justify-center">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className="p-3 bg-[#121212] hover:bg-[#25D366]/20 border border-white/10 rounded-lg transition-all hover:scale-110 group"
              title="Share on WhatsApp"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.473-.149-.673.149-.2.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.569-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.177 1.532 5.966L.052 23.135c-.116.439.274.83.713.713l5.169-1.48C7.823 22.446 9.88 23 12 23c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.946 0-3.817-.549-5.416-1.492l-.369-.218-3.846 1.102 1.102-3.846-.218-.369C2.549 15.817 2 13.946 2 12 2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
              </svg>
            </button>

            {/* Telegram */}
            <button
              onClick={handleTelegramShare}
              className="p-3 bg-[#121212] hover:bg-[#0088cc]/20 border border-white/10 rounded-lg transition-all hover:scale-110 group"
              title="Share on Telegram"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.941z" />
              </svg>
            </button>

            {/* Facebook */}
            <button
              onClick={handleFacebookShare}
              className="p-3 bg-[#121212] hover:bg-[#1877F2]/20 border border-white/10 rounded-lg transition-all hover:scale-110 group"
              title="Share on Facebook"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>

            {/* Instagram */}
            <button
              onClick={handleInstagramShare}
              className="p-3 bg-[#121212] hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#FCAF45] border border-white/10 rounded-lg transition-all hover:scale-110 group"
              title="Copy for Instagram"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownloadLink}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Download size={16} />
          <span>Download Audio File</span>
        </button>

        {copied && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs py-1 px-3 rounded-full animate-in fade-in slide-in-from-top-2 duration-200">
            Link copied!
          </div>
        )}
      </div>
    </div>
  )
}

const Popover = ({
  isOpen,
  onClose,
  audio,
  qari,
  isLibrary = false
}: {
  isOpen: boolean,
  onClose: () => void,
  audio: surah,
  qari: qari,
  isLibrary?: boolean
}) => {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [coordinates, setCoordinates] = useState({ top: 0, right: 0 })
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed'>('idle')
  const [libraryState, setLibraryState] = useState<'idle' | 'downloading' | 'completed'>('idle')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [showSharePopup, setShowSharePopup] = useState(false)
  const { isInLibrary, addToLibrary, removeFromLibrary } = useLibrary()

  const isAudioInLibrary = isInLibrary(audio.id)

  // Calculate position when popover opens
  useEffect(() => {
    if (isOpen) {
      // Find the trigger button (the button that was clicked)
      const findTriggerButton = () => {
        // Look for the button that was most recently clicked
        const activeElement = document.activeElement
        if (activeElement && activeElement.tagName === 'BUTTON') {
          return activeElement as HTMLElement
        }

        // Fallback: find the button in the parent container
        const buttons = document.querySelectorAll('button')
        for (let i = 0; i < buttons.length; i++) {
          const button = buttons[i]
          if (button.querySelector('.lucide-ellipsis-vertical')) {
            return button
          }
        }
        return null
      }

      const triggerButton = findTriggerButton()
      if (!triggerButton) return

      const calculatePosition = () => {
        const buttonRect = triggerButton.getBoundingClientRect()

        // Get popover dimensions after it's rendered
        setTimeout(() => {
          if (!popoverRef.current) return

          const popoverHeight = popoverRef.current.offsetHeight
          const popoverWidth = popoverRef.current.offsetWidth
          const viewportHeight = window.innerHeight
          const viewportWidth = window.innerWidth

          // Check space below
          const spaceBelow = viewportHeight - buttonRect.bottom
          const spaceAbove = buttonRect.top

          // Determine vertical position
          let top = buttonRect.bottom + 8 // 8px margin

          if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
            top = buttonRect.top - popoverHeight - 8
          }

          // Calculate right position (align to button's right edge)
          const right = viewportWidth - buttonRect.right

          // Check if popover would go off-screen to the left
          let finalRight = right
          if (right + popoverWidth > viewportWidth) {
            // If it would go off-screen, align to viewport edge with margin
            finalRight = 16 // 16px from right edge
          }

          setCoordinates({
            top: top,
            right: finalRight
          })
        }, 10)
      }

      calculatePosition()

      // Recalculate on window resize
      window.addEventListener('resize', calculatePosition)
      return () => window.removeEventListener('resize', calculatePosition)
    }
  }, [isOpen, audio.id])

  // Handle click outside - but not when share popup is open
  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      // Don't close if share popup is open
      if (showSharePopup) {
        // Check if the click is on the share popup backdrop or outside it
        const sharePopupElement = document.querySelector('.fixed.inset-0.z-\\[100\\]');
        if (sharePopupElement && sharePopupElement.contains(event.target as Node)) {
          // Let the share popup handle its own backdrop click
          return;
        }
        return;
      }

      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, showSharePopup])

  // Handle escape key - but not when share popup is open
  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      // Don't close if share popup is open
      if (showSharePopup) {
        // Close share popup on escape
        setShowSharePopup(false)
        return
      }

      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, showSharePopup])

  if (!isOpen) return null

  return (
    <>
      <div
        ref={popoverRef}
        id={audio.id.toString()}
        tabIndex={-1}
        className="fixed bg-[#1A1A1A] min-w-[200px] 
                   rounded-xl border border-white/10 shadow-2xl py-1.5 backdrop-blur-sm
                   transition-all fade-in zoom-in duration-200 z-[1000]"
        style={{
          top: `${coordinates.top}px`,
          right: `${coordinates.right}px`,
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {/* Download Button */}
        <button
          onClick={(e) => {
            if (downloadState !== 'downloading') {
              handleDownload(e, downloadState, setDownloadState, audio)
              onClose()
            }
          }}
          disabled={downloadState === 'downloading'}
          className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-white/10 
                     transition-colors duration-200 text-sm font-medium text-white/90 
                     first:rounded-t-xl group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-white/60 group-hover:text-white/90 transition-colors">
            {downloadState === 'downloading' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : downloadState === 'completed' ? (
              <Check size={18} className="text-green-500" />
            ) : (
              <ArrowDownCircle size={18} />
            )}
          </span>
          <span className="flex-1 text-left">
            {downloadState === 'downloading' ? 'Downloading...' :
              downloadState === 'completed' ? 'Downloaded!' :
                'Download'}
          </span>
        </button>

        {/* Add to Library Button */}
        {!isLibrary && (
          <button
            onClick={(e) => {
              if (libraryState !== 'downloading' && !isAudioInLibrary) {
                handleAddToLibrary(e, audio, libraryState, setLibraryState, setDownloadProgress, qari, isInLibrary, addToLibrary)
                onClose()
              }
            }}
            disabled={libraryState === 'downloading' || isAudioInLibrary}
            className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-white/10 
                     transition-colors duration-200 text-sm font-medium text-white/90 group
                     disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            <span className="text-white/60 group-hover:text-white/90 transition-colors">
              {libraryState === 'downloading' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isAudioInLibrary ? (
                <Check size={18} className="text-green-500" />
              ) : libraryState === 'completed' ? (
                <Check size={18} className="text-green-500" />
              ) : (
                <PlusCircle size={18} />
              )}
            </span>
            <span className="flex-1 text-left">
              {libraryState === 'downloading' ? 'Adding...' :
                isAudioInLibrary ? 'In Library' :
                  libraryState === 'completed' ? 'Added!' :
                    'Add to Library'}
            </span>

            {/* Progress indicator for download */}
            {libraryState === 'downloading' && downloadProgress > 0 && (
              <span className="text-xs text-gray-400">{downloadProgress}%</span>
            )}
          </button>
        )}
        {/* Share Button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowSharePopup(true)
          }}
          className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-white/10 
                     transition-colors duration-200 text-sm font-medium text-white/90 
                     last:rounded-b-xl group relative"
        >
          <span className="text-white/60 group-hover:text-white/90 transition-colors">
            <Share2 size={18} />
          </span>
          <span className="flex-1 text-left">Share</span>
        </button>

        {isLibrary && (
          <button
            onClick={(e) => {
              removeFromLibrary(e, audio.id)
              onClose()
            }}
            className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-white/10 
                       transition-colors duration-200 text-sm font-medium text-white/90 
                       last:rounded-b-xl group relative"
          >
            <span className="group-hover:text-red-500 text-red-700 transition-all">
              <Trash2 size={18} />
            </span>
            <span className="flex-1 text-left">
              Delete
            </span>
          </button>
        )}
      </div>

      {/* Share Popup - rendered inside popover but with higher z-index */}
      {showSharePopup && (
        <SharePopup
          audio={audio}
          qari={qari}
          onClose={() => {
            console.log('running...')
            setShowSharePopup(false)
          }}
        />
      )}
    </>
  )
}

export default Popover