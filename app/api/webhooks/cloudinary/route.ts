import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';
import getDatabaseConnection from "@/lib/mysql2";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function POST(req: NextRequest) {
    try {
        const signature = req.headers.get('x-cld-signature');
        const timestamp = req.headers.get('x-cld-timestamp');
        
        const bodyText = await req.text();

        if (!signature || !timestamp) {
            return NextResponse.json({ error: 'Missing headers' }, { status: 401 });
        }

        const isValid = cloudinary.utils.verifyNotificationSignature(
            bodyText,
            Number(timestamp),
            signature
        );

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const body = JSON.parse(bodyText);
        
        const recordId = body.context?.custom?.recordId;

        if (recordId) {
            const conn = await getDatabaseConnection();
            await conn.query('UPDATE surah SET url=? WHERE id=?', [body.public_id, recordId]);
        }

        return NextResponse.json({ status: 'success' });

    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
