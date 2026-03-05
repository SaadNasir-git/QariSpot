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
        const [result] = await conn.query<RowDataPacket[]>(`SELECT surah.*, qari.name AS qariName FROM surah INNER JOIN qari ON surah.qariId = qari.id WHERE surah.url LIKE ?`, [`%${url}%`]);

        return NextResponse.json({
            data: result[0]
        }, {
            status: 200
        })
    }, request)
}