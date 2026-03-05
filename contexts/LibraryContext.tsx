'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { sileo } from 'sileo';
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

interface StoredAudio extends surah {
  blob: Blob;
  qariName: string;
  dateAdded: string;
  size: number;
  duration?: number;
}

// Create a proper Dexie database class
class AudioLibraryDB extends Dexie {
  // Declare the table property with proper type
  audios!: Dexie.Table<StoredAudio, number>;

  constructor() {
    super('AudioLibrary');

    // Define tables and schema
    this.version(2).stores({
      audios: 'id, dateAdded, qariId, surahNo, qariName, url'
    });
  }
}

// Initialize database
const db = new AudioLibraryDB();

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Define context type
interface LibraryContextType {
  library: StoredAudio[];
  addToLibrary: (audio: surah, blob: Blob, qariId: number, qariName: string) => Promise<boolean>;
  removeFromLibrary: (e: React.MouseEvent<HTMLButtonElement>, audioId: number) => Promise<void>;
  getPlaybackUrl: (audioId: number) => string | null;
  isInLibrary: (audioId: number) => boolean;
  getRecordById: (audioId: number) => StoredAudio | undefined;
  totalSize: string;
}

// Create context
const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [offlineUrls, setOfflineUrls] = useState<Map<number, string>>(new Map());

  // useLiveQuery automatically refreshes when data changes 
  const library = useLiveQuery(
    async () => {
      const items = await db.audios
        .orderBy('dateAdded')
        .reverse()
        .toArray();

      // Clean up old URLs and create new ones
      offlineUrls.forEach(url => URL.revokeObjectURL(url));

      const urls = new Map<number, string>();
      items.forEach((item: StoredAudio) => {
        const url = URL.createObjectURL(item.blob);
        urls.set(item.id, url);
      });
      setOfflineUrls(urls);

      return items;
    },
    [], // dependencies
    [] // default value while loading
  ) || []; // Ensure it's always an array

  const addToLibrary = async (audio: surah, blob: Blob, qariId: number, qariName: string): Promise<boolean> => {
    let audioUrl: string | null = null;

    try {
      // Get audio duration (optional)
      let duration = 0;
      try {
        audioUrl = URL.createObjectURL(blob);
        const audioElement = new Audio();

        duration = await new Promise<number>((resolve, reject) => {
          audioElement.src = audioUrl!;
          audioElement.onloadedmetadata = () => resolve(audioElement.duration);
          audioElement.onerror = reject;

          // Timeout in case metadata loading takes too long
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });
      } catch (error) {
        console.warn('Could not get audio duration:', error);
      } finally {
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      }

      const storedAudio: StoredAudio = {
        id: audio.id,
        url: audio.url,
        surahNo: audio.surahNo,
        name: audio.name,
        qariId,
        qariName,
        blob,
        dateAdded: new Date().toISOString(),
        size: blob.size,
        duration
      };

      // Dexie handles the transaction automatically
      await db.audios.put(storedAudio);

      // Create object URL for immediate playback
      const url = URL.createObjectURL(blob);
      setOfflineUrls(prev => {
        const newMap = new Map(prev);
        newMap.set(storedAudio.id, url);
        return newMap;
      });

      sileo.success({title:'Added file successfully'});
      return true;

    } catch (error) {
      console.error('Failed to add to library:', error);
      sileo.error({title:'Failed to add to library'});
      return false;
    }
  };

  const removeFromLibrary = async (e: React.MouseEvent<HTMLButtonElement>, audioId: number): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await db.audios.delete(audioId);

      // Revoke object URL
      const url = offlineUrls.get(audioId);
      if (url) {
        URL.revokeObjectURL(url);
        setOfflineUrls(prev => {
          const newMap = new Map(prev);
          newMap.delete(audioId);
          return newMap;
        });
      }

      sileo.success({title:'Removed from library'});
    } catch (error) {
      console.error('Failed to remove:', error);
      sileo.error({title:'Failed to remove',description:'Failed to remove from library'});
    }
  };

  const getPlaybackUrl = (audioId: number): string | null => {
    return offlineUrls.get(audioId) || null;
  };

  const isInLibrary = (audioId: number): boolean => {
    return library.some(item => item.id === audioId);
  };

  const totalSize = formatFileSize(
    library.reduce((acc, item) => acc + item.size, 0)
  );

  const getRecordById = useCallback((audioId: number): StoredAudio | undefined => {
    return library.find(item => item.id === audioId);
  }, [library]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      offlineUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [offlineUrls]);

  return (
    <LibraryContext.Provider value={{
      library,
      addToLibrary,
      removeFromLibrary,
      getPlaybackUrl,
      isInLibrary,
      totalSize,
      getRecordById
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextType {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}