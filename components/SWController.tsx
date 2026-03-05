'use client';

import { useEffect, useRef } from 'react';

export function SWController() {
  const reloadTimeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed');
        
        // Clear any pending reload
        if (reloadTimeoutRef.current) {
          clearTimeout(reloadTimeoutRef.current);
        }
        
        // Don't reload automatically - let user control
        console.log('New service worker available, but not reloading');
      });

      // Check for waiting service workers
      navigator.serviceWorker.ready.then(registration => {
        if (registration.waiting) {
          console.log('Service worker waiting');
        }
      });
    }

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, []);

  return null;
}