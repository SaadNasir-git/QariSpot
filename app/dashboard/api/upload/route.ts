export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import getDatabaseConnection from "@/lib/mysql2";
import { RowDataPacket } from "mysql2";
import { parseBuffer } from "music-metadata";
import { v2 as cloudinary } from "cloudinary";
import { tryCatchBlock } from '@/lib/trycatchBlock';

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (buffer: Buffer, publicId: string): Promise<any> => {
    console.log(`[Cloudinary] Starting upload for publicId: ${publicId}`);
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto',
                // public_id: publicId, // UNCOMMENTED: This ensures the file is named 001, 002, etc.
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
    return await tryCatchBlock(async () => {
        const body = await req.json();
        const { url, qariId } = body;

        if (!url || !qariId) {
            return NextResponse.json({ message: 'URL and Qari ID are required' }, { status: 400 });
        }

        // 1. Fetch
        const response = await fetch(url);
        if (!response.ok) return NextResponse.json({ error: 'Failed to fetch audio' }, { status: 500 });

        // 2. Buffer
        const arrayBuffer = await response.arrayBuffer();
        const nodeBuffer = Buffer.from(arrayBuffer);

        // 3. Metadata
        const metadata = await parseBuffer(nodeBuffer, { mimeType: 'audio/mpeg' });
        const durationSeconds = metadata.format.duration || 0;

        // 4. Parse Details
        const urlPath = new URL(url).pathname;
        const fileName = urlPath.split('/').pop() || 'unknown.mp3';
        const surahNo = parseInt(fileName.split('.')[0], 10);

        if (isNaN(surahNo)) {
            return NextResponse.json({ message: 'Invalid Surah number' }, { status: 400 });
        }

        const conn = await getDatabaseConnection();

        const [existingRows] = await conn.query<RowDataPacket[]>(
            'SELECT id FROM surah WHERE surahNo=? AND qariId=?',
            [surahNo, qariId]
        );

        if (existingRows.length > 0) {
            return NextResponse.json({ message: 'Surah Already Exists' }, { status: 200 });
        }

        // 5. Get Surah Name
        const [rows] = await conn.query<RowDataPacket[]>('SELECT name FROM surah WHERE surahNo=? LIMIT 1', [surahNo]);

        if (!rows.length) {
            return NextResponse.json({ message: `Surah ${surahNo} not found` }, { status: 404 });
        }
        const surahName = rows[0].name;

        // 6. Upload
        const publicId = fileName.replace(/\.[^/.]+$/, "");
        const uploadResult = await uploadToCloudinary(nodeBuffer, publicId);

        // 7. Save
        const fileUrl = uploadResult.public_id;
        const fileSizeMb = parseFloat((uploadResult.bytes / (1024 * 1024)).toFixed(2));

        await conn.query(
            'INSERT INTO surah(name, qariId, durationSeconds, fileSizeMb, surahNo, url) VALUES(?, ?, ?, ?, ?, ?)',
            [surahName, qariId, durationSeconds, fileSizeMb, surahNo, fileUrl]
        );

        return NextResponse.json({ status: 'success', surahNo });
    }, req)
}
