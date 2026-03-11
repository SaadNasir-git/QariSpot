import getDatabaseConnection from "@/lib/mysql2";
import { tryCatchBlock } from "@/lib/trycatchBlock";
import { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    return tryCatchBlock(async () => {
        const { url } = await request.json()
        if (!url) {
            return NextResponse.json({
                message: 'Url is required'
            }, {
                status: 400
            })
        }
        const conn = await getDatabaseConnection();
        
        const [result] = await conn.query<RowDataPacket[]>(`
            WITH current_surah AS (
                SELECT surah.*, qari.name AS qariName 
                FROM surah 
                INNER JOIN qari ON surah.qariId = qari.id 
                WHERE surah.url LIKE ?
            ),
            all_qari_surahs AS (
                SELECT 
                    s.*,
                    q.name AS qariName
                FROM surah s
                INNER JOIN qari q ON s.qariId = q.id
                WHERE s.qariId = (SELECT qariId FROM current_surah LIMIT 1)
                ORDER BY s.surahNo
            )
            SELECT 
                JSON_OBJECT(
                    'id', cs.id,
                    'surahNo', cs.surahNo,
                    'qariId', cs.qariId,
                    'name', cs.name,
                    'url', cs.url,
                    'durationSeconds', cs.durationSeconds,
                    'fileSizeMb', cs.fileSizeMb,
                    'createdAt', cs.createdAt,
                    'qariName', cs.qariName
                ) AS current,
                (
                    SELECT JSON_OBJECT(
                        'id', aqs.id,
                        'surahNo', aqs.surahNo,
                        'qariId', aqs.qariId,
                        'name', aqs.name,
                        'url', aqs.url,
                        'durationSeconds', aqs.durationSeconds,
                        'fileSizeMb', aqs.fileSizeMb,
                        'createdAt', aqs.createdAt,
                        'qariName', aqs.qariName
                    )
                    FROM all_qari_surahs aqs
                    WHERE aqs.surahNo < cs.surahNo
                    ORDER BY aqs.surahNo DESC
                    LIMIT 1
                ) AS previous_surah,
                (
                    SELECT JSON_OBJECT(
                        'id', aqs.id,
                        'surahNo', aqs.surahNo,
                        'qariId', aqs.qariId,
                        'name', aqs.name,
                        'url', aqs.url,
                        'durationSeconds', aqs.durationSeconds,
                        'fileSizeMb', aqs.fileSizeMb,
                        'createdAt', aqs.createdAt,
                        'qariName', aqs.qariName
                    )
                    FROM all_qari_surahs aqs
                    WHERE aqs.surahNo > cs.surahNo
                    ORDER BY aqs.surahNo ASC
                    LIMIT 1
                ) AS next_surah
            FROM current_surah cs
        `, [`%${url}%`]);
        
        // Format the response
        const row = result[0];
        let audioData;
        
        if (row) {
            audioData = {
                // If it's already an object, use it directly; otherwise try to parse
                current: typeof row.current === 'string' ? JSON.parse(row.current) : row.current,
                previous_surah: row.previous_surah 
                    ? (typeof row.previous_surah === 'string' ? JSON.parse(row.previous_surah) : row.previous_surah)
                    : null,
                next_surah: row.next_surah 
                    ? (typeof row.next_surah === 'string' ? JSON.parse(row.next_surah) : row.next_surah)
                    : null
            };
            
            // Set to null if the parsed objects have no id (meaning no previous/next surah)
            if (audioData.previous_surah && !audioData.previous_surah.id) {
                audioData.previous_surah = null;
            }
            if (audioData.next_surah && !audioData.next_surah.id) {
                audioData.next_surah = null;
            }
        }
        
        return NextResponse.json({
            data: audioData
        }, {
            status: 200
        })
    }, request)
}