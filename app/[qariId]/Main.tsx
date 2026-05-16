/// <reference lib="dom" />

'use client'

import AudioCard from '@/components/AudioCard';
import { Amiri } from 'next/font/google';
import { useState, useEffect, useRef, useCallback } from 'react';
const amiri700 = Amiri({ weight: '700' })
import { CldImage } from 'next-cloudinary';
import { Search, X } from 'lucide-react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';

const MainQariPage = ({ qari, surahData }: { qari: qari, surahData: surah[] }) => {
  const [filteredSurahs, setFilteredSurahs] = useState(surahData);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const listenParam = searchParams.get('listen')

  useEffect(() => {
    if (listenParam) {
      const element = document.getElementById(listenParam);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  }, [listenParam])

  // Handle search filtering
  useEffect(() => {
    const func = async () => {
      if (searchQuery.trim() === '') {
        setFilteredSurahs(surahData);
      } else if (searchQuery.trim().length >= 2 && qari?.id) {
        const res = await axios.post('/api/surah', { qariId: qari.id, offset: 0, search: searchQuery })
        setFilteredSurahs(res.data.surah)
      }
    }
    func()
  }, [searchQuery]);

  // Focus input when search is opened
  useEffect(() => {
    if (isSearching && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearching]);

  // Close search on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isSearching) {
        setIsSearching(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isSearching]);

  const toggleSearch = useCallback(() => {
    searchInputRef.current.blur()
    setIsSearching(prev => {
      if (prev) setSearchQuery('');
      return !prev;
    });
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus({ preventScroll: true });
  }, [searchInputRef])

  return (
    <div className="relative w-full">
      {/* Fixed image container for mobile/tablet */}
      <div className="sticky top-0 z-50 w-full bg-gradient-to-b from-[#0A0A0A] to-transparent backdrop-blur-md h-0">
        <div className="max-w-7xl mx-auto px-4 h-0">
          <div className="flex items-center justify-between gap-2 h-0">
            {/* Search Input */}
            <div className='w-0 h-0'></div>
            <div
              className={`relative flex-1 max-w-md transition-all duration-300 ${!isSearching ? '-translate-y-16 opacity-0 pointer-events-none' : 'translate-y-8 opacity-100'
                }`}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search surah by name or number..."
                className="w-full bg-white/5 text-white/90 placeholder:text-white/30 py-2.5 pl-10 pr-4 rounded-xl border border-white/10 outline-none focus:border-green-500/50 focus:bg-white/10 transition-all duration-200 text-sm"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-3 h-3 text-white/50" />
                </button>
              )}
            </div>

            {/* Search Toggle Button */}
            <button
              onClick={toggleSearch}
              type='button'
              className={`
                p-3 rounded-xl transition-all duration-200 translate-y-8
                ${isSearching
                  ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                }
              `}
            >
              {isSearching ? <X size={20} /> : <Search size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div className='md:hidden sticky top-0 w-full h-64 bg-[#121212]'>
        <CldImage
          src={qari.picUrl}
          alt={qari.name}
          width={640}
          height={640}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="w-full h-64 object-cover object-center"
          crop="limit"
          quality="auto"
          format="auto"
          version="v1"
        />
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
      </div>

      {/* Desktop version - hidden on mobile */}
      <div className='md:block px-10 min-[829px]:px-28 md:py-20 hidden'>
        <div className='flex gap-10 items-center'>
          <div className='md:h-52'>
            <CldImage
              src={qari.picUrl}
              alt={qari.name}
              width={640}
              height={640}
              className="w-64 h-64 object-cover object-center rounded-full border-2 border-white/20"
              crop="limit"
              quality="auto"
              format="auto"
              version="v1"
            />
          </div>
          <div>
            <div className={`text-6xl text-white/80 leading-8 ${amiri700.className}`}>
              Qari
            </div>
            <span className='pl-10 text-2xl line-clamp-6'>
              {qari.name}
            </span>
          </div>
        </div>
      </div>

      {/* Surah content */}
      <div className='md:mt-0 -mt-28 z-10 relative'>
        {/* Qari name for mobile (shows below sticky image) */}
        <div className='md:hidden bg-gradient-to-b from-transparent to-[#121212] p-4 pt-6'>
          <div className={`text-6xl text-white/80 leading-8 ${amiri700.className}`}>
            Qari
          </div>
          <span className='pl-10 font-arabic text-2xl text-white line-clamp-6'>
            {qari.name}
          </span>
        </div>

        {/* Surah list */}
        <div className='space-y-4 text-white bg-[#121212] md:p-4 p-2'>
          {filteredSurahs.map((s) => (
            <AudioCard key={s.id} audio={s} qari={qari} />
          ))}

          {/* Empty State */}
          {filteredSurahs.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                <Search className="w-6 h-6 text-white/20" />
              </div>
              <h3 className="text-sm font-medium text-white/70 mb-1">No results found</h3>
              <p className="text-xs text-white/30 max-w-[200px]">
                No surahs match "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </div>
      {/*Load more button*/}
    </div>
  )
}

export default MainQariPage
