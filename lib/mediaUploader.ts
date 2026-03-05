// import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// export interface MediaUploadResult {
//     publicUrl: string;
//     secureUrl: string;
// }

// export class MediaUploader {
//     static async uploadFile(file: File, folderName: string): Promise<MediaUploadResult> {
//         const buffer = Buffer.from(await file.arrayBuffer());

//         const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
//             cloudinary.uploader.upload_large_stream(
//                 {
//                     folder: folderName,
//                     resource_type: 'auto',
//                 },
//                 (error, result) => {
//                     if (error) {
//                         reject(new Error(`Upload failed for ${file.name}: ${error.message}`));
//                         return;
//                     }
//                     if (!result) {
//                         reject(new Error(`Upload failed for ${file.name}: No result returned`));
//                         return;
//                     }
//                     resolve(result);
//                 }
//             ).end(buffer);
//         });

//         return {
//             publicUrl: uploadResult.public_id,
//             secureUrl: uploadResult.secure_url
//         };
//     }

//     static async uploadMultiple(files: File[], folderName: string): Promise<MediaUploadResult[]> {
//         const uploadPromises = files.map(file => this.uploadFile(file, folderName));
//         return Promise.all(uploadPromises);
//     }
// }






















































import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export interface MediaUploadResult {
    publicUrl: string;
    secureUrl: string;
}

export class MediaUploader {
    /**
     * Upload a file to Cloudinary
     * Automatically chooses between regular and large file upload based on file size
     */
    static async uploadFile(file: File, folderName: string): Promise<MediaUploadResult> {
        // Choose method based on file size (Cloudinary's limit is 100MB for regular uploads)
        if (file.size > 100 * 1024 * 1024) { // 100MB
            console.log(`File ${file.name} is large (${(file.size / (1024 * 1024)).toFixed(2)}MB), using large file upload method`);
            return this.uploadLargeFile(file, folderName);
        } else {
            console.log(`File ${file.name} is ${(file.size / (1024 * 1024)).toFixed(2)}MB, using regular upload method`);
            return this.uploadRegularFile(file, folderName);
        }
    }

    /**
     * Upload multiple files to Cloudinary
     */
    static async uploadMultiple(files: File[], folderName: string): Promise<MediaUploadResult[]> {
        const uploadPromises = files.map(file => this.uploadFile(file, folderName));
        return Promise.all(uploadPromises);
    }

    /**
     * Regular upload method for files under 100MB
     */
    private static async uploadRegularFile(file: File, folderName: string): Promise<MediaUploadResult> {
        try {
            // Convert file to base64
            const buffer = Buffer.from(await file.arrayBuffer());
            const base64Data = buffer.toString('base64');
            const dataURI = `data:${file.type};base64,${base64Data}`;
            
            const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
                cloudinary.uploader.upload(
                    dataURI,
                    {
                        folder: folderName,
                        resource_type: 'auto',
                        filename: file.name,
                        use_filename: true,
                        unique_filename: true
                    },
                    (error, result) => {
                        if (error) {
                            reject(new Error(`Upload failed for ${file.name}: ${error.message}`));
                            return;
                        }
                        if (!result) {
                            reject(new Error(`Upload failed for ${file.name}: No result returned`));
                            return;
                        }
                        resolve(result);
                    }
                );
            });

            return {
                publicUrl: uploadResult.public_id,
                secureUrl: uploadResult.secure_url
            };
        } catch (error) {
            console.error(`Error in uploadRegularFile for ${file.name}:`, error);
            throw error;
        }
    }

    /**
     * Large file upload method for files over 100MB
     * Uses streaming to handle large files efficiently
     */
    private static async uploadLargeFile(file: File, folderName: string): Promise<MediaUploadResult> {
        try {
            // Convert the File to a readable stream
            const buffer = Buffer.from(await file.arrayBuffer());
            const readableStream = Readable.from(buffer);
            
            const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
                // Create upload stream
                const uploadStream = cloudinary.uploader.upload_large_stream(
                    {
                        folder: folderName,
                        resource_type: 'auto',
                        filename: file.name,
                        use_filename: true,
                        unique_filename: true,
                        chunk_size: 6000000 // 6MB chunks (recommended for large files)
                    },
                    (error, result) => {
                        if (error) {
                            reject(new Error(`Upload failed for ${file.name}: ${error.message}`));
                            return;
                        }
                        if (!result) {
                            reject(new Error(`Upload failed for ${file.name}: No result returned`));
                            return;
                        }
                        resolve(result);
                    }
                );
                
                // Pipe the readable stream to the upload stream
                readableStream.pipe(uploadStream);
                
                // Handle stream errors
                readableStream.on('error', (error) => {
                    reject(new Error(`Stream error for ${file.name}: ${error.message}`));
                });

                // Handle upload stream errors
                uploadStream.on('error', (error) => {
                    reject(new Error(`Upload stream error for ${file.name}: ${error.message}`));
                });

                // Handle finish event
                uploadStream.on('finish', () => {
                    console.log(`Upload stream finished for ${file.name}`);
                });
            });

            return {
                publicUrl: uploadResult.public_id,
                secureUrl: uploadResult.secure_url
            };
        } catch (error) {
            console.error(`Error in uploadLargeFile for ${file.name}:`, error);
            throw error;
        }
    }

    /**
     * Alternative method using direct upload URL (useful for very large files)
     * This method doesn't load the entire file into memory
     */
    static async uploadFileDirect(file: File, folderName: string): Promise<MediaUploadResult> {
        try {
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folderName);
            formData.append('resource_type', 'auto');

            // Get upload signature from your backend (for security)
            // You'll need to implement an endpoint that returns upload params
            const signatureResponse = await fetch('/api/cloudinary-signature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    folder: folderName,
                    timestamp: Math.round(Date.now() / 1000)
                })
            });

            if (!signatureResponse.ok) {
                throw new Error('Failed to get upload signature');
            }

            const { signature, timestamp, apiKey } = await signatureResponse.json();
            
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);

            // Upload directly to Cloudinary
            const uploadResponse = await fetch(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.statusText}`);
            }

            const result = await uploadResponse.json();
            
            return {
                publicUrl: result.public_id,
                secureUrl: result.secure_url
            };
        } catch (error) {
            console.error(`Error in uploadFileDirect for ${file.name}:`, error);
            throw error;
        }
    }

    /**
     * Delete a file from Cloudinary
     */
    static async deleteFile(publicId: string): Promise<boolean> {
        try {
            const result = await new Promise<{ result: string }>((resolve, reject) => {
                cloudinary.uploader.destroy(publicId, (error, result) => {
                    if (error) {
                        reject(new Error(`Delete failed: ${error.message}`));
                        return;
                    }
                    resolve(result);
                });
            });

            return result.result === 'ok';
        } catch (error) {
            console.error('Error in deleteFile:', error);
            throw error;
        }
    }

    /**
     * Get file info from Cloudinary
     */
    static async getFileInfo(publicId: string): Promise<any> {
        try {
            const result = await new Promise<any>((resolve, reject) => {
                cloudinary.api.resource(publicId, (error, result) => {
                    if (error) {
                        reject(new Error(`Failed to get file info: ${error.message}`));
                        return;
                    }
                    resolve(result);
                });
            });

            return result;
        } catch (error) {
            console.error('Error in getFileInfo:', error);
            throw error;
        }
    }
}

// Example usage:
/*
// Initialize Cloudinary (do this once in your app)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload a single file
const result = await MediaUploader.uploadFile(file, 'my-folder');
console.log('Upload result:', result);

// Upload multiple files
const files = [file1, file2, file3];
const results = await MediaUploader.uploadMultiple(files, 'my-folder');
console.log('Upload results:', results);

// Delete a file
const deleted = await MediaUploader.deleteFile('public_id_here');
console.log('Deleted:', deleted);
*/
