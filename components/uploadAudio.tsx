import { useState, useRef, useEffect } from 'react'
import { sileo } from 'sileo';
import * as lame from '@breezystack/lamejs';

// Fix for lamejs - need to access the constructor properly
const Mp3Encoder = lame.Mp3Encoder;

interface MediaProps {
    media: File | null;
    updateMedia: (media: File | null) => void;
    isVariant?: boolean;
    errors?: Record<string, string>;
    setAudioDuration: (duration: number) => void
}

interface ProgressInfo {
    stage: 'extracting' | 'compressing' | 'ready';
    percentage: number;
    message: string;
}

const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MIN_FILE_SIZE = 1024; // 1KB

// Supported audio formats
const SUPPORTED_AUDIO_FORMATS = [
    'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'opus', 'webm'
];

// Supported video formats (will be converted to audio)
const SUPPORTED_VIDEO_FORMATS = [
    'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v'
];

// MIME types for supported formats
const SUPPORTED_MIME_TYPES = [
    // Audio MIME types
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac',
    'audio/opus', 'audio/webm',
    // Video MIME types
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    'video/x-msvideo', 'video/x-matroska', 'video/x-flv',
    'video/x-ms-wmv', 'video/m4v'
];

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const formatDuration = (seconds: number, setAudioDuration: (duration: number) => void): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    setAudioDuration(seconds)
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function Media({ media, updateMedia, errors, isVariant, setAudioDuration }: MediaProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [progress, setProgress] = useState<ProgressInfo>({ stage: 'ready', percentage: 0, message: '' })
    const [originalFileSize, setOriginalFileSize] = useState<number | null>(null)
    const [mediaDuration, setMediaDuration] = useState<number | null>(null)
    const [originalFileName, setOriginalFileName] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaRef = useRef<HTMLAudioElement | null>(null)

    // Clean up object URLs
    useEffect(() => {
        return () => {
            if (mediaRef.current) {
                URL.revokeObjectURL(mediaRef.current.src);
            }
        };
    }, [media]);

    // Extract audio from video file using Web Audio API with progress
    const extractAudioFromVideo = async (videoFile: File): Promise<File | null> => {
        return new Promise((resolve, reject) => {
            setProgress({
                stage: 'extracting',
                percentage: 0,
                message: 'Initializing video extraction...'
            });

            const video = document.createElement('video');
            video.preload = 'metadata';

            const videoUrl = URL.createObjectURL(videoFile);
            video.src = videoUrl;

            video.onloadedmetadata = async () => {
                setMediaDuration(video.duration);
                setProgress({
                    stage: 'extracting',
                    percentage: 10,
                    message: 'Video loaded, preparing audio extraction...'
                });

                try {
                    // Create audio context
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

                    // Create media element source
                    const source = audioContext.createMediaElementSource(video);

                    // Create destination node
                    const destination = audioContext.createMediaStreamDestination();
                    source.connect(destination);

                    // Create media recorder with high quality settings
                    const mediaRecorder = new MediaRecorder(destination.stream, {
                        mimeType: 'audio/webm;codecs=opus',
                        audioBitsPerSecond: 128000 // 128 kbps
                    });

                    const chunks: BlobPart[] = [];
                    let recordedDuration = 0;

                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            chunks.push(e.data);

                            // Update progress based on video playback
                            if (video.currentTime) {
                                recordedDuration = video.currentTime;
                                const percent = Math.min(90, 10 + Math.floor((recordedDuration / video.duration) * 80));
                                setProgress({
                                    stage: 'extracting',
                                    percentage: percent,
                                    message: `Extracting audio: ${Math.floor(recordedDuration)}s / ${Math.floor(video.duration)}s`
                                });
                            }
                        }
                    };

                    mediaRecorder.onstop = () => {
                        setProgress({
                            stage: 'extracting',
                            percentage: 95,
                            message: 'Processing extracted audio...'
                        });

                        // Create audio blob
                        const audioBlob = new Blob(chunks, { type: 'audio/webm' });

                        // Clean up
                        URL.revokeObjectURL(videoUrl);
                        source.disconnect();
                        audioContext.close();

                        // Convert to MP3 using lamejs
                        const audioFileName = videoFile.name.replace(/\.[^/.]+$/, '') + '.mp3';

                        // Convert WebM to MP3
                        convertToMp3(audioBlob).then(mp3Blob => {
                            setProgress({
                                stage: 'extracting',
                                percentage: 100,
                                message: 'Video conversion complete!'
                            });

                            const mp3File = new File([mp3Blob], audioFileName, {
                                type: 'audio/mp3',
                                lastModified: Date.now()
                            });
                            resolve(mp3File);
                        }).catch(error => {
                            console.error('MP3 conversion failed, using WebM fallback:', error);
                            // Fallback to WebM if MP3 conversion fails
                            const webmFile = new File([audioBlob], audioFileName.replace('.mp3', '.webm'), {
                                type: 'audio/webm',
                                lastModified: Date.now()
                            });
                            resolve(webmFile);
                        });
                    };

                    mediaRecorder.onerror = () => {
                        reject(new Error('Failed to extract audio from video'));
                    };

                    // Start recording
                    mediaRecorder.start();

                    setProgress({
                        stage: 'extracting',
                        percentage: 15,
                        message: 'Playing video for extraction...'
                    });

                    video.play();

                    // Update progress during playback
                    video.ontimeupdate = () => {
                        if (video.currentTime) {
                            const percent = 15 + Math.floor((video.currentTime / video.duration) * 70);
                            setProgress({
                                stage: 'extracting',
                                percentage: percent,
                                message: `Extracting audio: ${Math.floor(video.currentTime)}s / ${Math.floor(video.duration)}s`
                            });
                        }
                    };

                    // Stop recording when video ends
                    video.onended = () => {
                        setProgress({
                            stage: 'extracting',
                            percentage: 90,
                            message: 'Finalizing audio extraction...'
                        });
                        mediaRecorder.stop();
                    };

                    // Safety timeout
                    setTimeout(() => {
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                            video.pause();
                        }
                    }, (video.duration * 1000) + 1000);

                } catch (error) {
                    URL.revokeObjectURL(videoUrl);
                    reject(error);
                }
            };

            video.onerror = () => {
                URL.revokeObjectURL(videoUrl);
                reject(new Error('Failed to load video file'));
            };
        });
    };

    // Convert audio blob to MP3 using lamejs with progress
    const convertToMp3 = async (audioBlob: Blob): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(audioBlob);

            reader.onload = async (e) => {
                try {
                    setProgress({
                        stage: 'extracting',
                        percentage: 96,
                        message: 'Converting to MP3 format...'
                    });

                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const audioBuffer = await audioContext.decodeAudioData(e.target?.result as ArrayBuffer);

                    // Get audio data
                    const channels = audioBuffer.numberOfChannels;
                    const sampleRate = audioBuffer.sampleRate;
                    const samples = audioBuffer.length;

                    // Create MP3 encoder
                    const mp3encoder = new Mp3Encoder(channels, sampleRate, 128); // 128 kbps

                    // Get channel data
                    const channelData: Float32Array[] = [];
                    for (let i = 0; i < channels; i++) {
                        channelData.push(audioBuffer.getChannelData(i));
                    }

                    // Convert Float32 to Int16 and encode in chunks
                    const sampleBlockSize = 1152;
                    const mp3Data: Uint8Array[] = [];

                    for (let i = 0; i < samples; i += sampleBlockSize) {
                        const sampleChunk = Math.min(sampleBlockSize, samples - i);

                        if (channels === 1) {
                            // Mono
                            const monoChunk = new Int16Array(sampleChunk);
                            for (let j = 0; j < sampleChunk; j++) {
                                const sample = Math.max(-1, Math.min(1, channelData[0][i + j]));
                                monoChunk[j] = sample < 0 ? sample * 32768 : sample * 32767;
                            }
                            const mp3Chunk = mp3encoder.encodeBuffer(monoChunk);
                            if (mp3Chunk.length > 0) {
                                mp3Data.push(new Uint8Array(mp3Chunk));
                            }
                        } else {
                            // Stereo
                            const leftChunk = new Int16Array(sampleChunk);
                            const rightChunk = new Int16Array(sampleChunk);

                            for (let j = 0; j < sampleChunk; j++) {
                                const leftSample = Math.max(-1, Math.min(1, channelData[0][i + j]));
                                leftChunk[j] = leftSample < 0 ? leftSample * 32768 : leftSample * 32767;

                                const rightSample = Math.max(-1, Math.min(1, channelData[1][i + j]));
                                rightChunk[j] = rightSample < 0 ? rightSample * 32768 : rightSample * 32767;
                            }

                            const mp3Chunk = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                            if (mp3Chunk.length > 0) {
                                mp3Data.push(new Uint8Array(mp3Chunk));
                            }
                        }

                        // Update progress
                        const percent = 96 + Math.floor((i / samples) * 3);
                        setProgress({
                            stage: 'extracting',
                            percentage: Math.min(99, percent),
                            message: `Encoding MP3: ${Math.floor((i / samples) * 100)}%`
                        });
                    }

                    // Flush encoder
                    const mp3End = mp3encoder.flush();
                    if (mp3End.length > 0) {
                        mp3Data.push(new Uint8Array(mp3End));
                    }

                    // Combine all chunks
                    const totalLength = mp3Data.reduce((acc, chunk) => acc + chunk.length, 0);
                    const combinedData = new Uint8Array(totalLength);
                    let offset = 0;

                    for (const chunk of mp3Data) {
                        combinedData.set(chunk, offset);
                        offset += chunk.length;
                    }

                    // Create MP3 blob
                    const mp3Blob = new Blob([combinedData], { type: 'audio/mp3' });
                    resolve(mp3Blob);

                } catch (error) {
                    console.error('MP3 conversion error:', error);
                    reject(error);
                }
            };

            reader.onerror = reject;
        });
    };

    // Compress audio file using lamejs with progress
    const compressAudio = async (audioFile: File): Promise<File | null> => {
        return new Promise((resolve, reject) => {
            setProgress({
                stage: 'compressing',
                percentage: 0,
                message: 'Initializing compression...'
            });

            const reader = new FileReader();
            reader.readAsArrayBuffer(audioFile);

            reader.onload = async (e) => {
                try {
                    setProgress({
                        stage: 'compressing',
                        percentage: 5,
                        message: 'Decoding audio data...'
                    });

                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

                    // Decode audio data
                    const audioBuffer = await audioContext.decodeAudioData(e.target?.result as ArrayBuffer);

                    setProgress({
                        stage: 'compressing',
                        percentage: 15,
                        message: 'Analyzing audio...'
                    });

                    // Calculate optimal bitrate based on target size
                    const duration = audioBuffer.duration;
                    const targetSizeBytes = MAX_AUDIO_SIZE * 0.95; // Target 95MB to be safe
                    const targetBitrate = Math.floor((targetSizeBytes * 8) / duration / 1000); // kbps

                    // Choose bitrate (MP3 typical bitrates: 64, 96, 128, 160, 192, 256, 320 kbps)
                    let bitrate = 128; // Default 128 kbps

                    if (targetBitrate < 64) {
                        bitrate = 64; // 64 kbps - lower quality, suitable for speech
                    } else if (targetBitrate < 96) {
                        bitrate = 96; // 96 kbps - medium-low quality
                    } else if (targetBitrate < 128) {
                        bitrate = 128; // 128 kbps - good quality
                    } else if (targetBitrate < 192) {
                        bitrate = 192; // 192 kbps - high quality
                    } else {
                        bitrate = 320; // 320 kbps - very high quality
                    }

                    setProgress({
                        stage: 'compressing',
                        percentage: 20,
                        message: `Using ${bitrate}kbps MP3 compression...`
                    });

                    // Get audio data
                    const channels = audioBuffer.numberOfChannels;
                    const sampleRate = audioBuffer.sampleRate;
                    const samples = audioBuffer.length;

                    // Create MP3 encoder
                    const mp3encoder = new Mp3Encoder(channels, sampleRate, bitrate);

                    // Get channel data
                    const channelData: Float32Array[] = [];
                    for (let i = 0; i < channels; i++) {
                        channelData.push(audioBuffer.getChannelData(i));
                    }

                    // Convert Float32 to Int16 and encode in chunks
                    const sampleBlockSize = 1152; // LAME uses 1152 samples per frame
                    const mp3Data: Uint8Array[] = [];

                    for (let i = 0; i < samples; i += sampleBlockSize) {
                        const sampleChunk = Math.min(sampleBlockSize, samples - i);

                        if (channels === 1) {
                            // Mono
                            const monoChunk = new Int16Array(sampleChunk);
                            for (let j = 0; j < sampleChunk; j++) {
                                const sample = Math.max(-1, Math.min(1, channelData[0][i + j]));
                                monoChunk[j] = sample < 0 ? sample * 32768 : sample * 32767;
                            }
                            const mp3Chunk = mp3encoder.encodeBuffer(monoChunk);
                            if (mp3Chunk.length > 0) {
                                mp3Data.push(new Uint8Array(mp3Chunk));
                            }
                        } else {
                            // Stereo
                            const leftChunk = new Int16Array(sampleChunk);
                            const rightChunk = new Int16Array(sampleChunk);

                            for (let j = 0; j < sampleChunk; j++) {
                                const leftSample = Math.max(-1, Math.min(1, channelData[0][i + j]));
                                leftChunk[j] = leftSample < 0 ? leftSample * 32768 : leftSample * 32767;

                                const rightSample = Math.max(-1, Math.min(1, channelData[1][i + j]));
                                rightChunk[j] = rightSample < 0 ? rightSample * 32768 : rightSample * 32767;
                            }

                            const mp3Chunk = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                            if (mp3Chunk.length > 0) {
                                mp3Data.push(new Uint8Array(mp3Chunk));
                            }
                        }

                        // Update progress regularly
                        if (i % (sampleBlockSize * 5) === 0) {
                            const progressPercent = 20 + Math.floor((i / samples) * 70);
                            setProgress({
                                stage: 'compressing',
                                percentage: Math.min(90, progressPercent),
                                message: `Compressing audio: ${Math.floor((i / samples) * 100)}%`
                            });
                        }
                    }

                    setProgress({
                        stage: 'compressing',
                        percentage: 92,
                        message: 'Finalizing compression...'
                    });

                    // Flush encoder
                    const mp3End = mp3encoder.flush();
                    if (mp3End.length > 0) {
                        mp3Data.push(new Uint8Array(mp3End));
                    }

                    // Combine all chunks
                    const totalLength = mp3Data.reduce((acc, chunk) => acc + chunk.length, 0);
                    const combinedData = new Uint8Array(totalLength);
                    let offset = 0;

                    for (const chunk of mp3Data) {
                        combinedData.set(chunk, offset);
                        offset += chunk.length;
                    }

                    setProgress({
                        stage: 'compressing',
                        percentage: 98,
                        message: 'Creating compressed file...'
                    });

                    // Create MP3 blob
                    const mp3Blob = new Blob([combinedData], { type: 'audio/mp3' });

                    // Create output filename
                    const outputFileName = audioFile.name
                        .replace(/\.[^/.]+$/, '') + '_compressed.mp3';

                    const compressedFile = new File([mp3Blob], outputFileName, {
                        type: 'audio/mp3',
                        lastModified: Date.now()
                    });

                    setProgress({
                        stage: 'compressing',
                        percentage: 100,
                        message: 'Compression complete!'
                    });

                    // Check if compression was effective
                    if (compressedFile.size >= audioFile.size) {
                        // If compression didn't help, return original file
                        resolve(audioFile);
                    } else {
                        resolve(compressedFile);
                    }

                } catch (error) {
                    console.error('Compression error:', error);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read audio file'));
            };
        });
    };

    const isSupportedFormat = (file: File): boolean => {
        const extension = file.name.toLowerCase().split('.').pop() || '';

        // Check by extension
        if (SUPPORTED_AUDIO_FORMATS.includes(extension) || SUPPORTED_VIDEO_FORMATS.includes(extension)) {
            return true;
        }

        // Check by MIME type
        if (SUPPORTED_MIME_TYPES.includes(file.type)) {
            return true;
        }

        // Check if it's any audio/video type
        if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
            return true;
        }

        return false;
    }

    const getFileType = (file: File): 'audio' | 'video' | 'unknown' => {
        if (file.type.startsWith('audio/')) return 'audio';
        if (file.type.startsWith('video/')) return 'video';

        const extension = file.name.toLowerCase().split('.').pop() || '';
        if (SUPPORTED_AUDIO_FORMATS.includes(extension)) return 'audio';
        if (SUPPORTED_VIDEO_FORMATS.includes(extension)) return 'video';

        return 'unknown';
    }

    const validateFile = (file: File): string | null => {
        if (file.size < MIN_FILE_SIZE) {
            return `File is too small or corrupted.`;
        }

        if (!isSupportedFormat(file)) {
            const supportedFormats = [...SUPPORTED_AUDIO_FORMATS, ...SUPPORTED_VIDEO_FORMATS].join(', ').toUpperCase();
            return `File format not supported. Supported formats: ${supportedFormats}`;
        }

        return null;
    }

    const handleFile = async (file: File) => {
        setProcessing(true);
        setOriginalFileName(file.name);
        setOriginalFileSize(file.size);
        setProgress({ stage: 'ready', percentage: 0, message: '' });

        try {
            // Validate file
            const validationError = validateFile(file);
            if (validationError) {
                sileo.error({ title: 'File validation error', description: validationError });
                setProcessing(false);
                return;
            }

            const fileType = getFileType(file);
            let processedFile: File | null = file;
            let conversionPerformed = false;

            // If it's a video, extract audio (always convert video to audio)
            if (fileType === 'video') {
                try {
                    const audioFile = await extractAudioFromVideo(file);
                    if (audioFile) {
                        processedFile = audioFile;
                        conversionPerformed = true;
                        sileo.success({ title: 'Video converted to audio' });
                    }
                } catch (error) {
                    sileo.error({ title: 'Failed to extract audio from video' });
                    setProcessing(false);
                    setProgress({ stage: 'ready', percentage: 0, message: '' });
                    return;
                }
            }

            // ONLY compress if file size is larger than MAX_AUDIO_SIZE (100MB)
            if (processedFile && processedFile.size > MAX_AUDIO_SIZE) {
                try {
                    const compressedFile = await compressAudio(processedFile);
                    if (compressedFile) {
                        // Check if compression was effective
                        if (compressedFile.size < processedFile.size) {
                            processedFile = compressedFile;
                            sileo.success({ title: 'Audio compressed successfully', description: `Audio compressed from ${formatFileSize(originalFileSize!)} to ${formatFileSize(compressedFile.size)}` });
                        } else {
                            sileo.info({ title: 'File compression error', description: 'Could not compress file further, using original' });
                        }
                    }
                } catch (error) {
                    console.error('Compression error:', error);
                    sileo.error({ title: 'File compression error', description: 'Failed to compress audio, using original file' });
                }
            } else if (processedFile) {
                // File is under 100MB, no compression needed
                const sizeInMB = (processedFile.size / (1024 * 1024)).toFixed(2);
                sileo.success({ title: 'File Has compressed', description: `File uploaded (${sizeInMB}MB) - under 100MB limit` });
            }

            // Final validation and update
            if (processedFile) {
                // Get duration of the processed file
                const audio = new Audio();
                const audioUrl = URL.createObjectURL(processedFile);
                audio.src = audioUrl;

                audio.onloadedmetadata = () => {
                    setMediaDuration(audio.duration);
                    URL.revokeObjectURL(audioUrl);
                };

                updateMedia(processedFile);

                if (conversionPerformed) {
                    sileo.success({ title: 'Video converted to MP3 successfully' });
                }
            }
        } catch (error) {
            console.error('File processing error:', error);
            sileo.error({title:'Failed to process file'});
        } finally {
            setProcessing(false);
            // Keep progress visible for a moment then clear
            setTimeout(() => {
                setProgress({ stage: 'ready', percentage: 0, message: '' });
            }, 2000);
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const items = e.dataTransfer.items;
        let droppedFile: File | null = null;

        // Look for audio/video file
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
                    droppedFile = file;
                    break;
                }
            }
        }

        if (droppedFile) {
            handleFile(droppedFile);
        } else {
            sileo.error({title:'Audio file required',description:'Please drop a valid audio or video file'});
        }
    }

    const removeMedia = () => {
        updateMedia(null);
        setOriginalFileSize(null);
        setOriginalFileName(null);
        setMediaDuration(null);
        setProgress({ stage: 'ready', percentage: 0, message: '' });
    }

    // Generate accept attribute string for file input
    const getAcceptAttribute = () => {
        const extensions = [...SUPPORTED_AUDIO_FORMATS, ...SUPPORTED_VIDEO_FORMATS]
            .map(format => `.${format}`).join(',');
        return `${extensions},audio/*,video/*`;
    }

    const wasCompressed = originalFileSize && originalFileSize > (media?.size || 0);
    const compressionRatio = originalFileSize && media ?
        ((originalFileSize - media.size) / originalFileSize * 100).toFixed(1) : 0;

    // Progress Bar Component
    const ProgressBar = () => {
        const getStageColor = () => {
            switch (progress.stage) {
                case 'extracting': return 'bg-blue-500';
                case 'compressing': return 'bg-purple-500';
                default: return 'bg-green-500';
            }
        };

        const getStageIcon = () => {
            switch (progress.stage) {
                case 'extracting':
                    return (
                        <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    );
                case 'compressing':
                    return (
                        <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    );
                default:
                    return (
                        <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    );
            }
        };

        return (
            <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        {getStageIcon()}
                        <span className="text-gray-300">{progress.message}</span>
                    </div>
                    <span className="text-gray-400 font-mono">{progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                        className={`${getStageColor()} h-2 transition-all duration-300 ease-out rounded-full`}
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="rounded-lg border border-gray-800 bg-[#121212] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">
                    {isVariant ? 'Variant Audio' : 'Qari Audio'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                    Upload {isVariant ? 'a variant audio file' : 'a Qari audio file'}.
                    {isVariant && ' Required if inventory is greater than zero. '}
                    Video files will be converted to MP3. Audio files larger than 100MB will be compressed to MP3.
                </p>
            </div>

            <div className="p-6">
                <div className="space-y-4">
                    {errors?.media && (
                        <div className="p-3 border border-red-900/50 rounded-lg bg-red-950/30">
                            <div className="flex items-center gap-2 text-red-400">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium">{errors.media}</span>
                            </div>
                        </div>
                    )}

                    {/* Upload Area */}
                    {!media && (
                        <div
                            className={`
                        border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                        ${isDragging
                                    ? 'border-green-500 bg-green-950/30'
                                    : errors?.media
                                        ? 'border-red-800 bg-red-950/20'
                                        : 'border-gray-700 hover:border-gray-600 bg-[#1a1a1a]'
                                }
                        ${processing ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => !processing && fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={getAcceptAttribute()}
                                onChange={handleFileInput}
                                className="hidden"
                                disabled={processing}
                            />

                            {processing ? (
                                <div className="space-y-4">
                                    <svg className="mx-auto h-12 w-12 text-green-500 mb-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <p className="text-sm text-gray-300">
                                        {progress.message || 'Processing audio...'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Please wait while we process your file to MP3 format
                                    </p>

                                    {/* Progress Bar */}
                                    {progress.percentage > 0 && <ProgressBar />}
                                </div>
                            ) : (
                                <>
                                    <svg className="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                    </svg>
                                    <p className="text-sm text-gray-300">
                                        Drag and drop an audio or video file here, or click to browse
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC, MP4, MOV, AVI, MKV (converted to MP3)
                                    </p>
                                    <p className="text-xs text-green-600 mt-1 font-medium">
                                        Maximum audio size: 100MB after MP3 compression
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Media Preview */}
                    {media && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-medium text-gray-300">Uploaded Audio</h3>
                                <button
                                    type="button"
                                    onClick={removeMedia}
                                    className="text-sm text-red-400 hover:text-red-300 font-medium px-3 py-1.5 border border-red-900 rounded-md hover:bg-red-950/50 transition-colors"
                                >
                                    Remove Audio
                                </button>
                            </div>

                            <div className="relative group border-2 border-gray-800 rounded-lg overflow-hidden bg-[#1a1a1a] p-4">
                                {/* Audio Player */}
                                <audio
                                    ref={mediaRef}
                                    src={URL.createObjectURL(media)}
                                    controls
                                    className="w-full mb-4"
                                    onLoadedMetadata={(e) => setMediaDuration(e.currentTarget.duration)}
                                />

                                {/* File Info */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-400">File:</span>
                                        <span className="text-gray-200 font-medium truncate flex-1">
                                            {originalFileName || media.name}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <div className="bg-[#1e1e1e] rounded-md px-3 py-1.5">
                                            <span className="text-xs text-gray-500">Format</span>
                                            <p className="text-sm text-gray-300 font-medium">
                                                {media.type.includes('mp3') ? 'MP3' : media.name.split('.').pop()?.toUpperCase() || 'AUDIO'}
                                            </p>
                                        </div>

                                        <div className="bg-[#1e1e1e] rounded-md px-3 py-1.5">
                                            <span className="text-xs text-gray-500">Size</span>
                                            <p className="text-sm text-gray-300 font-medium">
                                                {formatFileSize(media.size)}
                                            </p>
                                        </div>

                                        {mediaDuration && (
                                            <div className="bg-[#1e1e1e] rounded-md px-3 py-1.5">
                                                <span className="text-xs text-gray-500">Duration</span>
                                                <p className="text-sm text-gray-300 font-medium">
                                                    {formatDuration(mediaDuration, setAudioDuration)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Processing Info */}
                                {originalFileName && originalFileName !== media.name && (
                                    <div className="mt-3 p-2 bg-blue-950/30 border border-blue-900 rounded-lg">
                                        <p className="text-xs text-blue-400 flex items-center gap-2">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <span>
                                                {originalFileName.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|ogg)$/)
                                                    ? 'Converted from video to MP3'
                                                    : 'Converted to MP3 format'}
                                            </span>
                                        </p>
                                    </div>
                                )}

                                {wasCompressed && (
                                    <div className="mt-3 p-2 bg-green-950/30 border border-green-900 rounded-lg">
                                        <p className="text-xs text-green-400 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            <span>
                                                <strong>MP3 Compression:</strong> Reduced size by {compressionRatio}%
                                                ({formatFileSize(originalFileSize!)} → {formatFileSize(media.size)})
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}