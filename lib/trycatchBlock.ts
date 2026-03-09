import { NextRequest, NextResponse } from "next/server";

export async function tryCatchBlock(callbackfunction: () => Promise<NextResponse>, request: NextRequest) {
    try {
        if (process.env.NEXT_PUBLIC_DOMAIN!.includes(request.headers.get('host'))) {
            return await callbackfunction();
        }
        return NextResponse.json({
            message: 'Astagfirullah'
        })
    } catch (error) {
        console.log(error)
        return NextResponse.json({
            success: false,
            error: "Internal server error"
        }, {
            status: 400
        })
    }
}