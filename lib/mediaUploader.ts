import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface MediaUploadResult {
    publicUrl: string;
    secureUrl: string;
}

export class MediaUploader {
    static async uploadFile(file: File, folderName: string): Promise<MediaUploadResult> {
        const buffer = Buffer.from(await file.arrayBuffer());

        const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
            cloudinary.uploader.upload_large_stream(
                {
                    folder: folderName,
                    resource_type: 'auto',
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
            ).end(buffer);
        });

        return {
            publicUrl: uploadResult.public_id,
            secureUrl: uploadResult.secure_url
        };
    }

    static async uploadMultiple(files: File[], folderName: string): Promise<MediaUploadResult[]> {
        const uploadPromises = files.map(file => this.uploadFile(file, folderName));
        return Promise.all(uploadPromises);
    }
}
