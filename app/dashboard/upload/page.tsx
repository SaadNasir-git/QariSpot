'use client'

import { useRef, useState } from "react"

const Page = () => {
    const inputRef = useRef<HTMLInputElement>(null)
    const QariIdRef = useRef<HTMLInputElement>(null)
    const [downloading, setDownloading] = useState(false)


    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!inputRef.current || !QariIdRef.current) return;

        // Assuming you have a way to get qariId (maybe from another input or state)
        // For this example, I'm treating the input as the Remote Reciter ID (for the URL)
        // And I'm hardcoding or assuming you have a `qariId` state variable for your DB.
        const host = inputRef.current.value;
        const qariId = QariIdRef.current.value;

        if (!host || !qariId) {
            alert('Please ensure Reciter ID and Qari ID are set.');
            return;
        }

        setDownloading(true);
        let failedCount = 0;

        // Process files sequentially (1 by 1) to ensure stability
        // You can increase concurrency if your server handles it well
        for (let i = 1; i <= 114; i++) {
            const surahNumber = String(i).padStart(3, '0');
            const remoteUrl = `${host}/${surahNumber}.mp3`;

            try {
                const res = await fetch('/dashboard/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: remoteUrl,
                        qariId: qariId
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    console.log(`Successfully processed Surah ${i}`);
                } else {
                    console.error(`Failed Surah ${i}:`, data.message);
                    failedCount++;
                }
            } catch (err) {
                console.error(`Network error on Surah ${i}`, err);
                failedCount++;
            }
        }

        setDownloading(false);

        if (failedCount === 0) {
            alert('All 114 files processed and uploaded successfully!');
        } else {
            alert(`Process completed with ${failedCount} errors. Check console for details.`);
        }
    };

    return (
        <div className="flex w-full h-screen justify-center items-center">
            <form onSubmit={onSubmit} className="space-y-2">
                <div className="w-full">
                    <label htmlFor="reciter" className="block mb-2">
                        Host:
                    </label>
                    <input
                        type="text"
                        id="reciter"
                        ref={inputRef}
                        className="border p-2 rounded"
                        placeholder="Enter reciter ID"
                        disabled={downloading}
                    />
                    <label htmlFor="qari" className="block mb-2">
                        QariId:
                    </label>
                    <input
                        type="text"
                        id="qari"
                        ref={QariIdRef}
                        className="border p-2 rounded"
                        placeholder="Enter qari ID"
                        disabled={downloading}
                    />
                </div>

                <button
                    type="submit"
                    disabled={downloading}
                    className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400 w-full"
                >
                    {downloading ? 'Downloading...' : 'Download All Surahs'}
                </button>

                {downloading && (
                    <div className="mt-4">
                        <p className="text-sm text-gray-600">
                            Downloads started - check your browser's download folder
                        </p>
                    </div>
                )}
            </form>
        </div>
    )
}

export default Page
