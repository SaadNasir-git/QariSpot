import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';
import { MediaUploadResult, MediaUploader } from "@/lib/mediaUploader";
import { tryCatchBlock } from "@/lib/trycatchBlock";
import getDatabaseConnection from "@/lib/mysql2";

const targetFolder = 'media-manager/photo-manager'

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function POST(request: NextRequest) {
    return await tryCatchBlock(async () => {
        const formData = await request.formData();
        const name = formData.get('name');
        const image = formData.get('image') as File;

        if (!name || !image) {
            return NextResponse.json({
                message: 'Data is required'
            }, {
                status: 400
            })
        }

        let uploadedImage: MediaUploadResult;
        try {
            uploadedImage = await MediaUploader.uploadFile(image, targetFolder);
        } catch (uploadError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to upload product images'
                },
                { status: 500 }
            );
        }
        const conn = await getDatabaseConnection();
        await conn.query('INSERT INTO qari(name, picUrl) VALUE(?, ?)', [name, uploadedImage.publicUrl])
        return NextResponse.json({
            success: true
        }, {
            status: 200
        })
    },request)
}