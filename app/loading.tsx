import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] flex items-center justify-center p-4">
      <div className="text-center">
        {/* Simple Quran SVG with Glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 mx-auto">
            <Image
              src="/quran.svg"
              alt="Quran"
              width={96}
              height={96}
              className="w-24 h-24 text-green-500 animate-pulse"
              priority
            />
          </div>
        </div>

        {/* Simple Text */}
        <h2 className="text-2xl font-light text-white/90 mb-2">
          Loading...
        </h2>
        
        {/* Minimal Progress Bar */}
        <div className="w-48 h-0.5 bg-white/10 rounded-full mx-auto mt-6 overflow-hidden">
          <div className="h-full bg-green-500 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
        </div>

        {/* Small Quran Icon Indicator */}
        <div className="mt-8 opacity-50">
          <Image
            src="/quran.svg"
            alt=""
            width={20}
            height={20}
            className="w-5 h-5 mx-auto opacity-30"
          />
        </div>
      </div>
    </div>
  );
}