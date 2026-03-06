import getDatabaseConnection from "@/lib/mysql2";
import { tryCatchBlock } from "@/lib/trycatchBlock";
import { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    return tryCatchBlock(async () => {
        const { qariId, offset, search } = await request.json();
        const conn = await getDatabaseConnection();

        if (!qariId) {
            return NextResponse.json({
                message: 'QariId is required'
            }, {
                status: 400
            })
        }

        if (search) {
            const cleanSearch = search.replace(/[^\w\s]/g, ' ');
            const searchPattern = `%${cleanSearch.trim()}%`;
            const searchNum = Number(search);

            const [surah] = await conn.query<RowDataPacket[]>(
                `SELECT * FROM surah 
         WHERE (name LIKE ? OR surahNo = ?) 
         AND qariId = ?`,
                [searchPattern, isNaN(searchNum) ? 0 : searchNum, Number(qariId)]
            );
            return NextResponse.json({ surah }, { status: 200 });
        }

        const [surah] = await conn.query<RowDataPacket[]>('SELECT * FROM surah WHERE qariId=? AND url IS NOT NULL ORDER BY surahNo ASC LIMIT ? OFFSET ?', [Number(qariId), 10, offset ? Number(offset) : 0])

        return NextResponse.json({
            surah
        }, {
            status: 200
        })
    }, request)
}
