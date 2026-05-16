import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import SideBar from '@/components/SideBar';
const poppins = Poppins({ weight: '300' })
import { LibraryProvider } from '@/contexts/LibraryContext';
import AudioPlayer from '@/components/AudioPlayer';
import { Toaster } from 'sileo';
import { SerwistProvider } from "./serwist";
import { AudioIdProvider } from '@/contexts/AudioContext';
import { SWController } from '@/components/SWController';
import Script from 'next/script';
import { Suspense } from 'react';

const APP_NAME = "QariSpot";
const APP_DEFAULT_TITLE = "QariSpot";
const APP_TITLE_TEMPLATE = "%s";
const APP_DESCRIPTION = 'Listen to the Holy Quran by renowned Qaris';

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: [
      {
        url: '/quran.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/quran.png',
        type: 'image/png',
      },
    ],
    shortcut: '/quran.png',
    apple: [
      {
        url: '/quran.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

const GTM_ID = 'GTM-KGRZSLK7';

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className='dark md:p-2 h-full bg-black'>
      <body className={`${poppins.className} h-full w-full flex flex-col bg-black`} suppressHydrationWarning>
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `,
          }}
        />

        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <script
          id="schema-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "QariSpot",
              "url": "https://qari-spot.vercel.app",
              "description": "Listen to the Holy Quran by renowned Qaris",
              "applicationCategory": "Multimedia",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "QariSpot"
              },
              "keywords": "Quran, Qari, Recitation, Tajweed, Islamic, Audio"
            })
          }}
        />
        <SerwistProvider swUrl="/sw.js">
          <LibraryProvider>
            <AudioIdProvider>
              <Toaster position="top-right" />
              <Header />
              <div className='md:grid md:grid-cols-[auto_1fr] h-full gap-2 md:rounded-2xl overflow-hidden'>
                <SideBar />
                <main className='bg-gradient-to-b from-[#0A0A0A] to-[#141414] md:rounded-2xl transition-all duration-300 ease-in-out h-full md:border md:border-white/5 shadow-2xl overflow-auto'>
                  {children}
                </main>
              </div>
              <Suspense fallback={null}>
                <AudioPlayer />
              </Suspense>
            </AudioIdProvider>
          </LibraryProvider>
          <SWController />
        </SerwistProvider>
      </body>
    </html>
  );
}
