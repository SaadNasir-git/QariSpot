import { Metadata } from 'next';
import MainQariPage from './Main';
import { notFound } from 'next/navigation';

async function getQariData(qariId: string): Promise<qari | null> {
  try {
    if (!qariId) return null;

    const response = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/qari`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qariId }),
      next: { revalidate: 3600 }
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Error fetching Qari:", error);
    return null;
  }
}

async function getSurah(qariId: string): Promise<surah[]> {
  try {
    if (!qariId) return [];

    const response = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/surah`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qariId,
        offset: 0
      }),
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) return [];
    return (await response.json()).surah || [];
  } catch (error) {
    console.error("Error fetching Surah:", error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ qariId: string }> }): Promise<Metadata> {
  const { qariId } = await params;
  const qariData = await getQariData(qariId);
  const domain = process.env.NEXT_PUBLIC_DOMAIN!;

  if (!qariData) {
    return {
      title: 'Qari Not Found'
    };
  }

  const title = `${qariData.name} - Quran Recitations`;
  const description = `Listen to the beautiful recitations of the Holy Quran by ${qariData.name}. Stream high quality audio online.`;
  const imageUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_1200,h_630,c_fill/${qariData.picUrl}`;
  const absoluteUrl = `${domain}/${qariId}`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl,
    },
    openGraph: {
      title,
      description,
      type: 'profile',
      url: absoluteUrl,
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: qariData.name
      }]
    },
    twitter: {
      card: 'player',
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
    }
  };
}

export async function generateStaticParams() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/qaris`); 
  const qaris = (await res.json()).data;
 
  return qaris.map((qari) => ({
    qariId: String(qari.id)
  }));
}

const QariPage = async ({ params }: { params: Promise<{ qariId: string }> }) => {
  const { qariId } = await params;
  
  const [qariData, surah] = await Promise.all([
    getQariData(qariId),
    getSurah(qariId)
  ]);

  if (!qariData) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: qariData.name,
    image: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${qariData.picUrl}`,
    jobTitle: 'Qari',
    description: `Quran Reciter - ${qariData.name}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <MainQariPage 
        qariData={Promise.resolve(qariData)} 
        surah={Promise.resolve(surah)} 
      />
    </>
  );
}

export default QariPage;
