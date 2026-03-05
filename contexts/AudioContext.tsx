'use client'

import { createContext, useContext, useState } from 'react';

// Define the context type
interface AudioContextType {
    audioId: number | string | undefined;
    setAudio: (audioId: number | string) => void;
}

// Create context with the proper type
export const AudioIdContext = createContext<AudioContextType | null>(null);

export function AudioIdProvider({ children }: { children: React.ReactNode }) {
    const [audioId, setAudioId] = useState<number | string>();

    const setAudio = (audioId: number | string) => {
        setAudioId(audioId);
    };

    return (
        <AudioIdContext.Provider value={{ audioId, setAudio }}>
            {children}
        </AudioIdContext.Provider>
    );
}

export function useAudio(): AudioContextType {
    const context = useContext(AudioIdContext);
    if (context === undefined) {
        throw new Error('useAudio must be used within a AudioIdProvider');
    }
    return context
}