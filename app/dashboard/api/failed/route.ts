import getDatabaseConnection from "@/lib/mysql2";
import { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        const conn = await getDatabaseConnection();
        const [rows] = await conn.query<RowDataPacket[]>(
            'SELECT surahNo FROM surah WHERE qariId=? ORDER BY surahNo', 
            [body]
        );
        
        // Extract surah numbers from rows
        const existingSurahNos = rows.map(row => row.surahNo);
        
        // Find missing surah numbers from 1 to 114
        const missed: number[] = [];
        for (let i = 1; i <= 114; i++) {
            if (!existingSurahNos.includes(i)) {
                missed.push(i);
            }
        }
        
        console.log(missed);
        
        return NextResponse.json({
            missed
        }, {
            status: 200
        });
        
    } catch (error) {
        console.error('Error in POST handler:', error);
        return NextResponse.json({
            error: 'Failed to process request'
        }, {
            status: 500
        });
    }
}
