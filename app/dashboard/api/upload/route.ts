export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import getDatabaseConnection from "@/lib/mysql2";
import { RowDataPacket } from "mysql2";
import { parseBuffer } from "music-metadata";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { tryCatchBlock } from '@/lib/trycatchBlock';

// Tell fluent-ffmpeg where to find the binary (Crucial for Vercel)
ffmpeg.setFfmpegPath(ffmpegPath as string);

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 1. Helper to Upload Buffers (Your original logic)
const uploadToCloudinary = (buffer: Buffer, publicId?: string): Promise<any> => {
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

// 2. Helper to Upload Streams (For compressed audio)
const uploadStreamToCloudinary = (stream: Readable, publicId: string): Promise<any> => {
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
        stream.pipe(uploadStream);
        stream.on('error', (err) => reject(err));
    });
};

// 3. Helper to Compress Audio using FFmpeg
// Takes a buffer and duration, returns a Readable Stream of the compressed MP3
const compressAudio = (inputBuffer: Buffer, durationSeconds: number): Promise<Readable> => {
    return new Promise((resolve, reject) => {

        // Calculate bitrate to fit under 95MB (approx 95,000 KB)
        // Formula: Size (KB) = Duration (s) * Bitrate (kbps) / 8
        // Target Bitrate = (Size * 8) / Duration
        const targetSizeKB = 95000; // 95MB in KB
        let targetBitrate = Math.floor((targetSizeKB * 8) / durationSeconds);

        // Clamp bitrate between reasonable limits for speech/audio
        // 64k is low quality, 128k is standard, 192k is high
        if (targetBitrate > 192) targetBitrate = 192;
        if (targetBitrate < 64) targetBitrate = 64; // If file is huge, 64k is the best we can do

        console.log(`[FFmpeg] Compressing to ${targetBitrate}kbps to fit under 100MB`);

        // Create a readable stream from the input buffer
        const inputStream = Readable.from(inputBuffer);

        const command = ffmpeg(inputStream)
            .inputFormat('mp3') // Assuming input is mp3
            .audioBitrate(targetBitrate)
            .audioCodec('libmp3lame') // Standard MP3 codec
            .format('mp3')
            .on('start', (cmd) => console.log('[FFmpeg] Started:', cmd))
            .on('error', (err) => {
                console.error('[FFmpeg] Error:', err);
                reject(err);
            });

        // Pipe to a PassThrough stream and cast it to Readable
        // PassThrough is a type of Readable stream, so this is safe
        const outputStream = command.pipe() as Readable;

        // Resolve with the output stream
        resolve(outputStream);
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

        // 2. Buffer (Required for Metadata and FFmpeg input)
        const arrayBuffer = await response.arrayBuffer();
        const nodeBuffer = Buffer.from(arrayBuffer);

        // 3. Metadata (Need duration for compression calculation)
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

        const [rows] = await conn.query<RowDataPacket[]>('SELECT name FROM surah WHERE surahNo=? LIMIT 1', [surahNo]);

        if (!rows.length) {
            return NextResponse.json({ message: `Surah ${surahNo} not found` }, { status: 404 });
        }
        const surahName = rows[0].name;

        // 5. Upload Logic (With Compression Check)
        const publicId = fileName.replace(/\.[^/.]+$/, "");
        let uploadResult;

        const SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

        if (nodeBuffer.length > SIZE_LIMIT) {
            console.log(`[API] File is ${nodeBuffer.length} bytes. Compressing...`);

            // A. Run Compression
            const compressedStream = await compressAudio(nodeBuffer, durationSeconds);

            // B. Upload Compressed Stream
            uploadResult = await uploadStreamToCloudinary(compressedStream, publicId);
        } else {
            // Upload Original Buffer
            uploadResult = await uploadToCloudinary(nodeBuffer, publicId);
        }

        // 6. Save
        const fileUrl = uploadResult.public_id;
        const fileSizeMb = parseFloat((uploadResult.bytes / (1024 * 1024)).toFixed(2));

        await conn.query(
            'INSERT INTO surah(name, qariId, durationSeconds, fileSizeMb, surahNo, url) VALUES(?, ?, ?, ?, ?, ?)',
            [surahName, qariId, durationSeconds, fileSizeMb, surahNo, fileUrl]
        );

        return NextResponse.json({ status: 'success', surahNo });
    }, req)
}
