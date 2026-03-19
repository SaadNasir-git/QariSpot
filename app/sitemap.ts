import { MetadataRoute } from 'next'

const BASE_URL = 'https://qari-spot.vercel.app';

export default async function sitemap(): MetadataRoute.Sitemap {
  const res = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/qaris`);
  const dynamicItems = (await res.json()).data;

  const dynamicEntries: MetadataRoute.Sitemap = dynamicItems.map((item) => ({
    url: `${BASE_URL}/${item.id}`,
    lastModified: item.createdAt,
  }))
  
  return [
    {
      url: 'https://qari-spot.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    }
  ]
}
