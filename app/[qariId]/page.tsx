import { Metadata } from 'next';
import MainQariPage from './Main'
import { notFound } from 'next/navigation';

async function getQariData(qariId: string) {
  try {
    if (qariId) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/qari`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qariId }),
        next: { revalidate: 3600 }
      })

      if (!response.ok) {
        return []
      }

      return (await response.json()).data
    }
    return []
  } catch (error) {
    return []
  }
}

async function getSurah(qariId: string) {
  try {
    if (qariId) {

      const reponse = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/surah`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qariId,
          offset: 0
        }),
        next: { revalidate: 3600 }
      })
      if (!reponse.ok) {
        return [];
      }
      return (await reponse.json()).surah
    }
    return []
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ qariId: string }> }): Promise<Metadata> {
  const { qariId } = await params
  const qariData = await getQariData(qariId)

  if (!qariData) {
    notFound()
  }

  return {
    title: `${qariData.name} - Quran Recitations`,
    description: `Listen to the beautiful recitations of the Holy Quran by ${qariData.name}`,
    openGraph: {
      title: `${qariData.name} - Quran Recitations`,
      description: `Listen to the beautiful recitations of the Holy Quran by ${qariData.name}`,
      images: [{
        url: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_1200,h_630,c_fill/${qariData.picUrl}`,
        width: 1200,
        height: 630,
        alt: qariData.name
      }]
    }
  }
}

const QariPage = async ({ params }: { params: Promise<{ qariId: string }> }) => {
  const qariData = getQariData((await params).qariId)
  const surah = getSurah((await params).qariId)

  return <MainQariPage qariData={qariData} surah={surah} />
}

export default QariPage
