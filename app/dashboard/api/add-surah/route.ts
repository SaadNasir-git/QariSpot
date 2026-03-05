import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';
import { MediaUploadResult, MediaUploader } from "@/lib/mediaUploader";
import { tryCatchBlock } from "@/lib/trycatchBlock";
import getDatabaseConnection from "@/lib/mysql2";

const targetFolder = 'media-manager/audio-manager'

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function POST(request: NextRequest) {
    return await tryCatchBlock(async () => {
        const formData = await request.formData();
        const name: any = formData.get('name');
        const surah = formData.get('surah') as File;
        const qariId = Number(formData.get('qariId'));
        const audioDuration = Number(formData.get('audioDuration'))
        const surahNo = Number(formData.get('surahNo'))

        const isOk = !name || !surahNo || surahNo === 0 || !qariId || !surah || !audioDuration || audioDuration === 0

        if (isOk) {
            return NextResponse.json({
                message: 'Data is required'
            }, {
                status: 400
            })
        }

        let uploadedAudio: MediaUploadResult;
        try {
            uploadedAudio = await MediaUploader.uploadFile(surah, targetFolder);
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
        await conn.query('INSERT INTO surah(name, qariId, url, durationSeconds, fileSizeMb, surahNo) VALUE(?, ?, ?, ?, ?, ?)', [name.replace(/[^\w\s]/g, ' '), qariId, uploadedAudio.publicUrl, audioDuration, parseFloat((surah.size / (1024 * 1024)).toFixed(2)), surahNo])
        return NextResponse.json({
            success: true
        }, {
            status: 200
        })
    }, request)
}