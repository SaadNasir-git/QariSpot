import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from "cloudinary";
import { tryCatchBlock } from '@/lib/trycatchBlock';
import { inngest } from '@/lib/inngest/client';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = (buffer: Buffer, publicId?: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto',
                upload_preset: process.env.CLOUDINARY_PRESET_NAME,
                chunk_size: 20 * 1024 * 1024,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url, qariId } = body;

        console.log('Received upload request:', { url, qariId });

        if (!url || !qariId) {
            return NextResponse.json({ 
                message: 'URL and Qari ID are required' 
            }, { status: 400 });
        }

        // Send to Inngest
        const result = await inngest.send({
            name: 'files/upload.complete',
            data: {
                url,
                qariId
            }
        });

        console.log('Inngest event sent:', result);

        return NextResponse.json({ 
            status: 'success',
            eventId: result.ids?.[0]
        });
    } catch (error) {
        console.error('Upload endpoint error:', error);
        return NextResponse.json({ 
            message: 'Internal server error',
            error: String(error)
        }, { status: 500 });
    }
}
