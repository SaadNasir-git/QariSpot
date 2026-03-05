import getDatabaseConnection from "@/lib/mysql2";
import { tryCatchBlock } from "@/lib/trycatchBlock";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest) {
    return await tryCatchBlock(async() => {
        const conn = await getDatabaseConnection();
        const [result] = await conn.query('SELECT * FROM qari');
        return NextResponse.json({
            data:result
        },{
            status:200
        })
    },request)
}