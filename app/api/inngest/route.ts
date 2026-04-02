import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { parseBuffer } from "music-metadata";
import getDatabaseConnection from "@/lib/mysql2";
import { RowDataPacket } from "mysql2";
import { uploadToCloudinary } from "@/app/dashboard/api/upload/route";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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

        // Fetch the file
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const nodeBuffer = Buffer.from(arrayBuffer);

        // Get metadata
        const metadata = await parseBuffer(nodeBuffer, { mimeType: 'audio/mpeg' });
        const durationSeconds = metadata.format.duration || 0;

        // Get surah name from pre-fetched map
        const surahName = surahMap.get(index);
        if (!surahName) {
            throw new Error(`Surah ${index} not found in database`);
        }

        const fileName = `${index}.mp3`;
        const publicId = fileName.replace(/\.[^/.]+$/, "");

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(nodeBuffer, publicId);
        const fileUrl = uploadResult.public_id;
        const fileSizeMb = parseFloat((uploadResult.bytes / (1024 * 1024)).toFixed(2));

        // Insert into database
        conn = await getDatabaseConnection();
        await conn.query(
            'INSERT INTO surah(name, qariId, durationSeconds, fileSizeMb, surahNo, url) VALUES(?, ?, ?, ?, ?, ?)',
            [surahName, qariId, durationSeconds, fileSizeMb, index, fileUrl]
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

        for (let batchStart = 1; batchStart <= TOTAL_SURAHS; batchStart += BATCH_SIZE) {
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

// async function processChunk(
//     chunk: number[],
//     remoteUrl: string,
//     qariId: number,
//     surahMap: Map<number, string>,
//     existingSurahs: Set<string>
// ) {
//     const promises = chunk.map(index =>
//         processSurah(index, remoteUrl, qariId, surahMap, existingSurahs)
//     );
//     return await Promise.all(promises);
// }

// const uploadFiles = inngest.createFunction(
//     {
//         id: 'upload-files',
//         retries: 3,
//         triggers: { event: 'files/upload.complete' }
//     },
//     async ({ event, step }) => {
//         // Step 1: Fetch all surah names in one query
//         const surahData = await step.run('fetch-surah-names', async () => {
//             const conn = await getDatabaseConnection();
//             const [rows] = await conn.query<RowDataPacket[]>(
//                 'SELECT surahNo, name FROM surah ORDER BY surahNo'
//             );

//             const surahMap = new Map<number, string>();
//             rows.forEach(row => {
//                 surahMap.set(row.surahNo, row.name);
//             });
//             await conn.end();

//             return surahMap;
//         });

//         // Step 2: Fetch existing surahs for this qari to avoid duplicates
//         const existingSurahsSet = await step.run('fetch-existing-surahs', async () => {
//             const conn = await getDatabaseConnection();
//             const [rows] = await conn.query<RowDataPacket[]>(
//                 'SELECT surahNo FROM surah WHERE qariId = ?',
//                 [event.data.qariId]
//             );

//             const existingSet = new Set<string>();
//             rows.forEach(row => {
//                 existingSet.add(`${row.surahNo}-${event.data.qariId}`);
//             });
//             await conn.end();

//             return existingSet;
//         });

//         // Step 3: Process surahs in parallel chunks
//         const CHUNK_SIZE = 5;
//         const TOTAL_SURAHS = 114;
//         const allResults = [];

//         for (let i = 1; i < TOTAL_SURAHS; i += CHUNK_SIZE) {
//             const chunk = Array.from(
//                 { length: Math.min(CHUNK_SIZE, TOTAL_SURAHS - i) },
//                 (_, idx) => i + idx
//             );

//             const chunkResults = await step.run(`process-chunk-${i}`, async () => {
//                 return await processChunk(
//                     chunk,
//                     event.data.url,
//                     event.data.qariId,
//                     surahData,
//                     existingSurahsSet
//                 );
//             });

//             allResults.push(...chunkResults);

//             // Add a small delay between chunks to avoid rate limiting
//             if (i + CHUNK_SIZE < TOTAL_SURAHS) {
//                 await step.sleep('rate-limit-delay', '1s');
//             }
//         }

//         // Step 4: Generate summary
//         const summary = {
//             total: allResults.length,
//             successful: allResults.filter(r => r.status === 'success').length,
//             failed: allResults.filter(r => r.status === 'failed').length,
//             skipped: allResults.filter(r => r.status === 'skipped').length,
//             details: allResults
//         };

//         // Step 5: Log failures if any
//         if (summary.failed > 0) {
//             console.error('Failed surahs:', allResults.filter(r => r.status === 'failed'));
//         }

//         return {
//             message: 'Task completed successfully',
//             summary
//         };
//     }
// );
