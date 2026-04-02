import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from "cloudinary";
import { tryCatchBlock } from '@/lib/trycatchBlock';
import { inngest } from '@/lib/inngest/client';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url, qariId } = body;

        console.log('Received upload request:', { url, qariId });

        if (!url || !qariId) {
            return NextResponse.json({ 
                message: 'URL and Qari ID are required' 
            }, { status: 400 });
        }

        // Send to Inngest
        const result = await inngest.send({
            name: 'files/upload.complete',
            data: {
                url,
                qariId
            }
        });

        console.log('Inngest event sent:', result);

        return NextResponse.json({ 
            status: 'success',
            eventId: result.ids?.[0]
        });
    } catch (error) {
        console.error('Upload endpoint error:', error);
        return NextResponse.json({ 
            message: 'Internal server error',
            error: String(error)
        }, { status: 500 });
    }
}
