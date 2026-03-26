import { MetadataRoute } from 'next'

// Use this constant everywhere to ensure consistency
const BASE_URL = 'https://qari-spot.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${BASE_URL}/api/qaris`, {
      next: { revalidate: 3600 } 
    });

    if (!res.ok) {
      console.error(`Sitemap fetch failed: ${res.status} ${res.statusText}`);
      return [{ url: BASE_URL, lastModified: new Date() }];
    }

    const json = await res.json();
    const dynamicItems = Array.isArray(json.data) ? json.data : [];

    const dynamicEntries: MetadataRoute.Sitemap = dynamicItems.map((item: any) => ({
      url: `${BASE_URL}/${item.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
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
    console.error("Error generating sitemap:", error);
    return [
      {
        url: BASE_URL,
        lastModified: new Date(),
      },
    ];
  }
}
