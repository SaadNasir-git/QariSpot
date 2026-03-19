import { MetadataRoute } from 'next'

const BASE_URL = 'https://qari-spot.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/qaris`);
    const json = await res.json();
    const dynamicItems = json.data || [];

    const dynamicEntries: MetadataRoute.Sitemap = dynamicItems.map((item: any) => ({
      url: `${BASE_URL}/${item.id}`,
      lastModified: new Date(item.createdAt),
    }));
    
    return [
      {
        url: BASE_URL,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 1,
      },
      ...dynamicEntries
    ];
  } catch (error) {
    return [
      {
        url: BASE_URL,
        lastModified: new Date(),
      },
    ];
  }
}
