import getDatabaseConnection from "@/lib/mysql2";
import { tryCatchBlock } from "@/lib/trycatchBlock";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    return tryCatchBlock(async () => {
        const { search, role }: { search: string, role: string } = await request.json()
        const conn = await getDatabaseConnection();
        const values: string[] = [];
        let whereClause: string = '';
        if (search.trim().length >= 2) {
            search.trimStart().trimEnd().split(' ').map((term) => {
                if (!whereClause.includes('WHERE')) whereClause += 'WHERE '
                whereClause += ' name LIKE ? OR email LIKE ? '
                values.push(`%${term}%`, `%${term}%`);
            })
        }
        if (role.length > 4) {
            if (!whereClause.includes('WHERE')) {
                whereClause += 'WHERE role = ?'
            } else {
                whereClause += 'OR role = ?'
            }
            values.push(role)
        }
        console.log(`SELECT * FROM users ${whereClause}`)
        const [users] = await conn.query(`SELECT * FROM users ${whereClause}`, values);
        return NextResponse.json({
            users: users,
            success: true
        }, {
            status: 200
        })
    }, request)
}