import getDatabaseConnection from "@/lib/mysql2";
import { tryCatchBlock } from "@/lib/trycatchBlock";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
    return tryCatchBlock(async () => {
        const { userId, role } = await request.json();

        if (!userId || !role || !(role.length > 0)) {
            return NextResponse.json({
                message: 'Data is required'
            }, {
                status: 400
            })
        }

        const conn = await getDatabaseConnection();
        await conn.query('UPDATE users SET role = ? WHERE id = ?', [role, userId])

        return NextResponse.json({
            success: true
        }, {
            status: 200
        })
    }, request)
}