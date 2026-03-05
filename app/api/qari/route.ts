import getDatabaseConnection from "@/lib/mysql2";
import { tryCatchBlock } from "@/lib/trycatchBlock";
import { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    return tryCatchBlock(async () => {
        const { qariId } = await request.json()

        const conn = await getDatabaseConnection();
        const [qariData] = await conn.query<RowDataPacket[]>('SELECT * FROM qari WHERE id=?', [Number(qariId)])

        if (qariData.length > 0) {
            return NextResponse.json({
                data: qariData[0]
            }, {
                status: 200
            })
        }
        return NextResponse.json({
            message: 'Qari does not exists in database'
        }, {
            status: 404
        })
    },request)
}