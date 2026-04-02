import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import getDatabaseConnection from "@/lib/mysql2";
import { RowDataPacket } from "mysql2";
import { v2 as cloudinary } from "cloudinary";
import { PassThrough, Readable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadStreamToCloudinary = (stream: Readable): Promise<any> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'video',
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

// Helper function to process a single surah with retry logic
async function processSurah(
    index: number,
    remoteUrl: string,
    qariId: number,
    surahMap: Map<number, string>,
    existingSurahs: Set<string>
) {
    let conn;
    try {
        const surahNumber = String(index).padStart(3, '0');
        const url = `${remoteUrl}/${surahNumber}.mp3`;

        // Check if already exists
        const existingKey = `${index}-${qariId}`;
        if (existingSurahs.has(existingKey)) {
            return { surahNo: index, status: 'skipped', reason: 'already exists' };
        }

        const response = await fetch(url);
        if (!response.ok || !response.body) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }

        // 1. Determine if we need compression based on headers
        const contentLength = Number(response.headers.get('content-length')) || 0;
        const sizeLimit = 100 * 1024 * 1024;
        
        // Convert Web Stream to Node Stream
        const nodeReadable = Readable.from(response.body as any);
        let finalStream: Readable;

        if (contentLength > sizeLimit) {
            console.log(`Compressing surah ${index} (${(contentLength / 1048576).toFixed(2)} MB)`);
            const compressionStream = new PassThrough();
            
            ffmpeg(nodeReadable)
                .setFfmpegPath(ffmpegInstaller.path)
                .audioBitrate('96k')
                .format('mp3')
                .on('error', (err) => console.error('FFmpeg Error:', err))
                .pipe(compressionStream);

            finalStream = compressionStream;
        } else {
            finalStream = nodeReadable;
        }

        const uploadResult = await uploadStreamToCloudinary(finalStream);
        
        const publicId = uploadResult.public_id;
        const durationSeconds = uploadResult.duration || 0;
        const fileSizeMb = parseFloat((uploadResult.bytes / (1024 * 1024)).toFixed(2));

        const surahName = surahMap.get(index);
        if (!surahName) throw new Error(`Surah ${index} not found in database`);

        conn = await getDatabaseConnection();
        await conn.query(
            'INSERT INTO surah(name, qariId, durationSeconds, fileSizeMb, surahNo, url) VALUES(?, ?, ?, ?, ?, ?)',
            [surahName, qariId, durationSeconds, fileSizeMb, index, publicId]
        );

        return {
            surahNo: index,
            status: 'success',
            duration: durationSeconds,
            size: fileSizeMb
        };

    } catch (error) {
        console.error(`Failed to process surah ${index}:`, error);
        return { surahNo: index, status: 'failed', error: String(error) };
    } finally {
        if (conn) await conn.end();
    }
}

const uploadFilesEnhanced = inngest.createFunction(
    {
        id: 'upload-files-enhanced',
        retries: 3,
        triggers: { event: 'files/upload.complete' }
    },
    async ({ event, step, logger }) => {
        // Progress tracking
        await step.run('initialize-progress', async () => {
            logger.info(`Starting upload for qari ${event.data.qariId} from ${event.data.url}`);
        });

        // Fetch all required data
        const [surahMap, existingSurahs] = await Promise.all([
            (async () => {
                const conn = await getDatabaseConnection();
                const [rows] = await conn.query<RowDataPacket[]>(
                    'SELECT surahNo, name FROM surah ORDER BY surahNo'
                );
                await conn.end();
                return new Map(rows.map(row => [row.surahNo, row.name]));
            })(),
            (async () => {
                const conn = await getDatabaseConnection();
                const [rows] = await conn.query<RowDataPacket[]>(
                    'SELECT surahNo FROM surah WHERE qariId = ?',
                    [event.data.qariId]
                );
                await conn.end();
                return new Set(rows.map(row => `${row.surahNo}-${event.data.qariId}`));
            })()
        ]);

        // Process in batches with progress logging
        const BATCH_SIZE = 5;
        const TOTAL_SURAHS = 114;
        const results = [];

        for (let batchStart = 1; batchStart < TOTAL_SURAHS; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, TOTAL_SURAHS - 1);
            const batchNumbers = Array.from(
                { length: batchEnd - batchStart + 1 },
                (_, i) => batchStart + i
            );

            logger.info(`Processing batch ${batchStart}-${batchEnd}`);

            const batchResults = await Promise.allSettled(
                batchNumbers.map(surahNo =>
                    step.run(`process-surah-${surahNo}`, async () => {
                        return await processSurah(
                            surahNo,
                            event.data.url,
                            event.data.qariId,
                            surahMap,
                            existingSurahs
                        );
                    })
                )
            );

            // Process results
            batchResults.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    logger.error(`Failed to process surah ${batchNumbers[idx]}:`, result.reason);
                    results.push({
                        surahNo: batchNumbers[idx],
                        status: 'failed',
                        error: result.reason?.message || 'Unknown error'
                    });
                }
            });

            // Log progress
            const processedCount = Math.min(batchEnd, TOTAL_SURAHS - 1);
            const successCount = results.filter(r => r.status === 'success').length;
            logger.info(`Progress: ${processedCount}/${TOTAL_SURAHS - 1} surahs processed (${successCount} successful)`);

            // Rate limiting delay
            if (batchEnd < TOTAL_SURAHS - 1) {
                await step.sleep('rate-limit', '1s');
            }
        }

        // Generate final summary
        const summary = {
            total: results.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'failed').length,
            skipped: results.filter(r => r.status === 'skipped').length
        };

        if (summary.failed > 0) {
            logger.error(`Upload completed with ${summary.failed} failures`);
        } else {
            logger.info(`Upload completed successfully! Processed ${summary.successful} surahs`);
        }

        return {
            message: 'Upload process completed',
            summary
        };
    }
);

// Export both functions or choose one
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [uploadFilesEnhanced]
});
