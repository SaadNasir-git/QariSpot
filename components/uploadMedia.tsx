import { useState, useRef, useEffect } from 'react'
import imageCompression from 'browser-image-compression';
import { sileo } from 'sileo';

interface MediaProps {
    image: File | null;
    updateImage: (image: File | null) => void;
    isVariant?: boolean;
    errors?: Record<string, string>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_FILE_SIZE = 1024; // 1KB
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // 2MB - compress files larger than this

// Cloudinary supported image formats
const CLOUDINARY_SUPPORTED_FORMATS = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'ico',
    'webp', 'svg', 'avif', 'jxl', 'jp2', 'j2k', 'wdp', 'hdp', 'heic', 'heif'
];

// MIME types for Cloudinary supported formats
const CLOUDINARY_MIME_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp',
    'image/tiff', 'image/tif', 'image/x-icon', 'image/webp', 'image/svg+xml',
    'image/avif', 'image/jxl', 'image/jp2', 'image/jpx', 'image/jpm',
    'image/heic', 'image/heif', 'image/heif-sequence'
];

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export function Media({ image, updateImage, errors, isVariant }: MediaProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [compressing, setCompressing] = useState(false)
    const [originalFileSize, setOriginalFileSize] = useState<number | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Initialize preview when image changes
    useEffect(() => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }

        if (image) {
            const newPreview = URL.createObjectURL(image);
            setImagePreview(newPreview);
        } else {
            setImagePreview(null);
        }

        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [image]);

    // Image compression function
    const compressImage = async (file: File): Promise<File | null> => {
        try {
            const targetSizeMB = 9.5;
            let quality = 0.9;
            let maxWidthOrHeight = 3840;

            const currentSizeMB = file.size / (1024 * 1024);
            const reductionNeeded = currentSizeMB / targetSizeMB;

            if (reductionNeeded > 3) {
                quality = 0.5;
                maxWidthOrHeight = 1920;
            } else if (reductionNeeded > 2) {
                quality = 0.7;
                maxWidthOrHeight = 2560;
            } else if (reductionNeeded > 1.5) {
                quality = 0.8;
                maxWidthOrHeight = 3000;
            }

            const options = {
                maxSizeMB: targetSizeMB,
                maxWidthOrHeight: maxWidthOrHeight,
                useWebWorker: true,
                fileType: file.type,
                initialQuality: quality,
                alwaysKeepResolution: true,
            };

            const compressedFile = await imageCompression(file, options);

            if (compressedFile.size > MAX_FILE_SIZE) {
                const secondTryOptions = {
                    maxSizeMB: targetSizeMB,
                    maxWidthOrHeight: Math.floor(maxWidthOrHeight * 0.8),
                    useWebWorker: true,
                    fileType: file.type,
                    initialQuality: quality * 0.8,
                    alwaysKeepResolution: true,
                };

                const secondTryCompressed = await imageCompression(file, secondTryOptions);
                return secondTryCompressed.size <= MAX_FILE_SIZE ? secondTryCompressed : null;
            }

            return compressedFile;
        } catch (error) {
            return null;
        }
    };

    const isCloudinarySupported = (file: File): boolean => {
        const extension = file.name.toLowerCase().split('.').pop() || '';
        if (CLOUDINARY_SUPPORTED_FORMATS.includes(extension)) {
            return true;
        }

        if (CLOUDINARY_MIME_TYPES.includes(file.type)) {
            return true;
        }
        return false;
    }

    const validateFile = (file: File): string | null => {
        if (file.size > MAX_FILE_SIZE) {
            return `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
        }

        if (file.size < MIN_FILE_SIZE) {
            return `File is too small or corrupted.`;
        }

        if (!isCloudinarySupported(file)) {
            const supportedFormats = CLOUDINARY_SUPPORTED_FORMATS.join(', ').toUpperCase();
            return `File format not supported. Cloudinary supports: ${supportedFormats}`;
        }

        return null;
    }

    const handleFile = async (file: File) => {
        setCompressing(true);

        try {
            let originalSize = file.size;
            let processedFile = file;
            let wasCompressed = false;

            // Validate file
            const validationError = validateFile(file);

            if (validationError) {
                // If file is too large, try compression
                if (file.size > MAX_FILE_SIZE) {
                    try {
                        const compressedFile = await compressImage(file);
                        if (compressedFile && compressedFile.size <= MAX_FILE_SIZE) {
                            processedFile = compressedFile;
                            wasCompressed = true;
                        } else {
                            sileo.error({title:'File validation error',description:validationError});
                            setCompressing(false);
                            return;
                        }
                    } catch (error) {
                        sileo.error({title:'File validation error',description:validationError});
                        setCompressing(false);
                        return;
                    }
                } else {
                    sileo.error({title:'File validation error',description:validationError});
                    setCompressing(false);
                    return;
                }
            }

            // Compress if needed (even if within limits but over threshold)
            if (!wasCompressed && file.size > COMPRESSION_THRESHOLD) {
                try {
                    const compressedFile = await compressImage(file);
                    if (compressedFile) {
                        processedFile = compressedFile;
                        wasCompressed = true;
                    }
                } catch (error) {
                    // Continue with original file
                }
            }

            // Final validation
            const finalValidationError = validateFile(processedFile);
            if (finalValidationError) {
                sileo.error({title:'File validation error',description:finalValidationError});
            } else {
                setOriginalFileSize(wasCompressed ? originalSize : null);
                updateImage(processedFile);

                if (wasCompressed) {
                    sileo.success({title:'Image compressed successfully'});
                }
            }
        } finally {
            setCompressing(false);
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

        // Look for image file
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file && file.type.startsWith('image/')) {
                    droppedFile = file;
                    break;
                }
            }
        }

        if (droppedFile) {
            handleFile(droppedFile);
        } else {
            sileo.error({title:'Image is required',description:'Please drop a valid image file'});
        }
    }

    const removeImage = () => {
        updateImage(null);
        setOriginalFileSize(null);
    }

    // Generate accept attribute string for file input
    const getAcceptAttribute = () => {
        const extensions = CLOUDINARY_SUPPORTED_FORMATS.map(format => `.${format}`).join(',');
        return `${extensions},image/*`;
    }

    const wasCompressed = originalFileSize && originalFileSize > (image?.size || 0);
    const compressionRatio = originalFileSize && image ? ((originalFileSize - image.size) / originalFileSize * 100).toFixed(1) : 0;

    return (
        <div className="rounded-lg border border-gray-800 bg-[#121212] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">
                    {isVariant ? 'Variant Image' : 'Qari Image'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                    Upload {isVariant ? 'a variant image' : 'a Qari image'}. At least one image is required {isVariant && 'if inventory is greater than zero'}. All images are optimized with Cloudinary.
                </p>
            </div>

            <div className="p-6">
                <div className="space-y-4">
                    {errors?.images && (
                        <div className="p-3 border border-red-900/50 rounded-lg bg-red-950/30">
                            <div className="flex items-center gap-2 text-red-400">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium">{errors.images}</span>
                            </div>
                        </div>
                    )}

                    {/* Upload Area */}
                    {!image && (
                        <div
                            className={`
                        border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                        ${isDragging
                                    ? 'border-green-500 bg-green-950/30'
                                    : errors?.images
                                        ? 'border-red-800 bg-red-950/20'
                                        : 'border-gray-700 hover:border-gray-600 bg-[#1a1a1a]'
                                }
                        ${compressing ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => !compressing && fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={getAcceptAttribute()}
                                onChange={handleFileInput}
                                className="hidden"
                                disabled={compressing}
                            />

                            {compressing ? (
                                <>
                                    <svg className="mx-auto h-12 w-12 text-green-500 mb-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <p className="text-sm text-gray-300">Compressing image...</p>
                                    <p className="text-xs text-gray-500 mt-1">Please wait while we optimize your image for better performance.</p>
                                </>
                            ) : (
                                <>
                                    <svg className="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <p className="text-sm text-gray-300">Drag and drop an image here, or click to browse</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Cloudinary-optimized formats: JPG, PNG, GIF, WEBP, AVIF, JPEG-XL, SVG, BMP, TIFF, HEIC, etc.
                                    </p>
                                    <p className="text-xs text-green-600 mt-1 font-medium">
                                        Maximum file size: {MAX_FILE_SIZE / 1024 / 1024}MB.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Image Preview */}
                    {image && imagePreview && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-medium text-gray-300">Uploaded Image</h3>
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="text-sm text-red-400 hover:text-red-300 font-medium px-3 py-1.5 border border-red-900 rounded-md hover:bg-red-950/50 transition-colors"
                                >
                                    Remove Image
                                </button>
                            </div>

                            <div className="relative group border-2 border-gray-800 rounded-lg overflow-hidden bg-[#1a1a1a]">
                                {/* Poster Badge */}
                                {!isVariant && (
                                    <div className="absolute top-2 left-2 bg-amber-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10 shadow-lg">
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                        Poster
                                    </div>
                                )}

                                {/* Image */}
                                <img
                                    src={imagePreview}
                                    alt="Qari"
                                    className="w-full h-48 object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjIyMjIyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIGR5PSIuM2VtIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2Ij5QcmV2aWV3IEVycm9yPC90ZXh0Pjwvc3ZnPg==';
                                    }}
                                />

                                {/* File Info Badges */}
                                <div className="absolute bottom-2 left-2 flex gap-2">
                                    <span className="bg-black/80 text-gray-300 text-xs px-2 py-1 rounded font-medium backdrop-blur-sm">
                                        {image.name.split('.').pop()?.toUpperCase() || 'IMG'}
                                    </span>
                                    <span className="bg-black/80 text-gray-300 text-xs px-2 py-1 rounded font-medium backdrop-blur-sm">
                                        {formatFileSize(image.size)}
                                    </span>
                                </div>

                                {/* Compression Badge */}
                                {wasCompressed && (
                                    <div className="absolute bottom-2 right-2">
                                        <div className="relative group/tooltip">
                                            <div className="bg-black/80 text-green-400 text-xs px-2 py-1 rounded cursor-help flex items-center gap-1 backdrop-blur-sm">
                                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                                </svg>
                                                <span>Compressed</span>
                                            </div>
                                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#1a1a1a] text-gray-300 text-xs rounded-md shadow-xl border border-gray-800 p-2 hidden group-hover/tooltip:block">
                                                <p>Original: {formatFileSize(originalFileSize)}</p>
                                                <p>Saved: {compressionRatio}%</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Compression Summary */}
                            {wasCompressed && (
                                <div className="p-3 bg-green-950/30 border border-green-900 rounded-lg">
                                    <p className="text-xs text-green-400 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        <span>
                                            <strong>Image was compressed</strong> to reduce file size while maintaining quality.
                                            {originalFileSize && (
                                                <span className="ml-1">
                                                    (Original: {formatFileSize(originalFileSize)} → Current: {formatFileSize(image.size)})
                                                </span>
                                            )}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}