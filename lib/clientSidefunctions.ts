import { MouseEvent } from "react";

type states = 'idle' | 'downloading' | 'completed'

export const handleDownload = async (e: MouseEvent<HTMLButtonElement>, downloadState: states, setDownloadState: (state: states) => void, audio: surah) => {
    e.preventDefault()
    e.stopPropagation()

    try {
        if (downloadState === 'downloading') return;
        setDownloadState('downloading');

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const cleanFileName = `Surah_${audio.name.replace(/[^\w]|\/|\\/g, "_")}`;

        const downloadUrl = `https://res.cloudinary.com/${cloudName}/video/upload/fl_attachment:${cleanFileName}/v1/${audio.url}.mp3`;

        // Method 1: Use direct download without DOM manipulation
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${cleanFileName}.mp3`;
        link.target = '_blank';
        link.style.display = 'none'; // Hide the link

        // Check if the link is already in the DOM before appending
        if (!document.body.contains(link)) {
            document.body.appendChild(link);
        }

        link.click();

        // Use setTimeout to ensure the click event has completed
        setTimeout(() => {
            if (document.body.contains(link)) {
                document.body.removeChild(link);
            }
        }, 100);

        setDownloadState('completed');
        setTimeout(() => setDownloadState('idle'), 2000);

    } catch (error) {
        setDownloadState('idle');
    }
}


interface HandleAddToLibraryParams {
    e: MouseEvent<HTMLButtonElement>;
    audio: surah;
    libraryState: states;
    setLibraryState: (state: states) => void;
    setDownloadProgress?: (n: number) => void;
    qari: qari;
    isInLibrary: (audioId: number) => boolean;
    addToLibrary: (audio: surah, blob: Blob, qariId: number, qariName: string) => Promise<boolean>;
}

export const handleAddToLibrary = async ({ e, audio, libraryState, setLibraryState, setDownloadProgress, qari, isInLibrary, addToLibrary }: HandleAddToLibraryParams) => {
    e.preventDefault();
    e.stopPropagation();

    if (libraryState === 'downloading' || isInLibrary(audio.id)) return;
    setLibraryState('downloading');
    if (setDownloadProgress) {
        setDownloadProgress(0);
    }

    try {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const fileUrl = `https://res.cloudinary.com/${cloudName}/video/upload/v1/${audio.url}.mp3`;

        // Fetch with progress tracking
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Download failed');

        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength || '0', 10);
        let loaded = 0;

        const reader = response.body?.getReader();
        const chunks = [];

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                loaded += value.length;

                if (total > 0) {
                    const progress = Math.round((loaded / total) * 100);
                    if (setDownloadProgress) {
                        setDownloadProgress(progress);
                    }
                }
            }
        }

        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        await addToLibrary(audio, blob, qari.id, qari.name);

        setLibraryState('completed');
        setTimeout(() => {
            setLibraryState('idle');
            if (setDownloadProgress) {
                setDownloadProgress(0);
            }
        }, 2000);

    } catch (error) {
        console.error('Library add failed:', error);
        // sileo.error(`Failed to add ${audio.name} to library`);
        setLibraryState('idle');
    }
};

export const handleShowPopover = (
    e: React.MouseEvent<HTMLButtonElement>,
    audioId: number,
    setActivePopoverId: (value: number | null) => void,
    activePopoverId: number | null
): void => {
    e.preventDefault();
    e.stopPropagation();
    setActivePopoverId(activePopoverId === audioId ? null : audioId);
}

export const handleClosePopover = (
    setActivePopoverId: (value: number | null) => void
): void => {
    setActivePopoverId(null);
}