'use client';

import { useEffect, useState } from 'react';

export default function DebugOffline() {
  const [online, setOnline] = useState(true);
  const [cachedItems, setCachedItems] = useState<any[]>([]);

  useEffect(() => {
    setOnline(navigator.onLine);
    
    // List all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        Promise.all(names.map(async name => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return { name, urls: keys.map(k => k.url) };
        })).then(setCachedItems);
      });
    }

    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Offline Debug Page</h1>
      <div className="mb-4">
        Status: <span className={online ? 'text-green-500' : 'text-red-500'}>
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
      
      <h2 className="text-xl font-semibold mb-2">Cached Items:</h2>
      <div className="space-y-4">
        {cachedItems.map(cache => (
          <div key={cache.name} className="border p-4 rounded">
            <h3 className="font-medium mb-2">Cache: {cache.name}</h3>
            <ul className="list-disc pl-5 space-y-1">
              {cache.urls.map((url: string) => (
                <li key={url} className="text-sm break-all">{url}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}