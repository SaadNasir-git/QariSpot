import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';
import { MediaUploadResult, MediaUploader } from "@/lib/mediaUploader";
import { tryCatchBlock } from "@/lib/trycatchBlock";
import getDatabaseConnection from "@/lib/mysql2";
import { ResultSetHeader } from "mysql2";

const targetFolder = 'media-manager/audio-manager'

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function POST(request: NextRequest) {
  return await tryCatchBlock(async () => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString() || "";
    const surah = formData.get('surah') as File | null;
    const qariId = Number(formData.get('qariId'));
    const audioDuration = Number(formData.get('audioDuration'));
    const surahNo = Number(formData.get('surahNo'));
    const surahSize = Number(formData.get('surahSize'));

    if (!name || !surahNo || !qariId || !audioDuration) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const conn = await getDatabaseConnection();
    const sanitizedName = name.replace(/[^\w\s]/g, ' ');

    let audioUrl = "";
    let finalSizeMb = 0;

    if (surah) {
      try {
        const uploadedAudio: MediaUploadResult = await MediaUploader.uploadFile(surah, targetFolder);
        audioUrl = uploadedAudio.publicUrl;
        finalSizeMb = parseFloat((surah.size / (1024 * 1024)).toFixed(2));
      } catch (uploadError) {
        return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
      }
    } else {
      finalSizeMb = parseFloat((surahSize / (1024 * 1024)).toFixed(2));
    }

    const [result] = await conn.query<ResultSetHeader>(
      'INSERT INTO surah(name, qariId, url, durationSeconds, fileSizeMb, surahNo) VALUES(?, ?, ?, ?, ?, ?)',
      [sanitizedName, qariId, audioUrl, audioDuration, finalSizeMb, surahNo]
    );

    return NextResponse.json({ 
      success: true, 
      recordId: result.insertId 
    }, { status: 200 });

  }, request);
}
