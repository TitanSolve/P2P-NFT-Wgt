import { useState, useEffect, useCallback, useRef } from 'react';
import imageCache from '../services/imageCache';

/**
 * Custom hook for cached image loading
 * @param {string} imageUrl - The image URL to load and cache
 * @param {string} fallbackUrl - Fallback image URL if primary fails
 * @param {Object} options - Additional options
 * @returns {Object} - Image state and utilities
 */
export const useCachedImage = (imageUrl, fallbackUrl = null, options = {}) => {
  const [cachedUrl, setCachedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const currentRequestRef = useRef(null);
  
  const {
    eager = false, // Whether to load immediately
    preload = false, // Whether this is a preload request
  } = options;

  const loadImage = useCallback(async (url, fallback) => {
    if (!url || url.trim() === '' || url === 'undefined' || url === 'null') {
      setCachedUrl(fallback);
      setIsLoaded(!!fallback);
      return fallback;
    }

    // If the URL is already the fallback, just use it directly
    if (url === fallback) {
      setCachedUrl(fallback);
      setIsLoaded(true);
      return fallback;
    }

    // Check if already cached
    if (imageCache.isCached(url)) {
      const cached = await imageCache.getCachedImage(url, fallback);
      setCachedUrl(cached);
      setIsLoaded(true);
      return cached;
    }

    setIsLoading(true);
    setError(null);
    
    const requestId = Date.now();
    currentRequestRef.current = requestId;

    try {
      const cached = await imageCache.getCachedImage(url, fallback);
      
      // Check if this is still the current request
      if (currentRequestRef.current === requestId) {
        setCachedUrl(cached);
        setIsLoaded(true);
        setError(null);
      }
      
      return cached;
    } catch (err) {
      if (currentRequestRef.current === requestId) {
        setError(err);
        setCachedUrl(fallback);
        setIsLoaded(!!fallback);
      }
      return fallback;
    } finally {
      if (currentRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load image when URL changes
  useEffect(() => {
    if (imageUrl && (eager || !preload)) {
      loadImage(imageUrl, fallbackUrl);
    } else if (!imageUrl && fallbackUrl) {
      setCachedUrl(fallbackUrl);
      setIsLoaded(true);
    }
  }, [imageUrl, fallbackUrl, eager, preload, loadImage]);

  // Manual load function for lazy loading
  const load = useCallback(() => {
    if (imageUrl) {
      return loadImage(imageUrl, fallbackUrl);
    }
    return Promise.resolve(fallbackUrl);
  }, [imageUrl, fallbackUrl, loadImage]);

  // Reset function
  const reset = useCallback(() => {
    setCachedUrl(null);
    setIsLoading(false);
    setError(null);
    setIsLoaded(false);
    currentRequestRef.current = null;
  }, []);

  return {
    src: cachedUrl || fallbackUrl,
    isLoading,
    isLoaded,
    error,
    load,
    reset,
    isCached: imageUrl ? imageCache.isCached(imageUrl) : false
  };
};

/**
 * Hook for preloading multiple images
 * @param {string[]} imageUrls - Array of image URLs to preload
 * @param {Object} options - Preload options
 */
export const useImagePreloader = (imageUrls = [], options = {}) => {
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const preloadedCountRef = useRef(0);
  
  const {
    enabled = true,
    delay = 0, // Delay before starting preload
    batchSize = 5, // Number of images to preload concurrently
  } = options;

  const preloadImages = useCallback(async (urls) => {
    if (!urls.length || !enabled) return;

    setIsPreloading(true);
    setPreloadProgress(0);
    preloadedCountRef.current = 0;

    // Filter out already cached images
    const uncachedUrls = urls.filter(url => url && !imageCache.isCached(url));
    
    if (uncachedUrls.length === 0) {
      setPreloadProgress(100);
      setIsPreloading(false);
      return;
    }

    // Process in batches
    for (let i = 0; i < uncachedUrls.length; i += batchSize) {
      const batch = uncachedUrls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url) => {
        try {
          await imageCache.getCachedImage(url);
          preloadedCountRef.current++;
          setPreloadProgress((preloadedCountRef.current / uncachedUrls.length) * 100);
        } catch (error) {
          console.warn(`Failed to preload image: ${url}`, error);
          preloadedCountRef.current++;
          setPreloadProgress((preloadedCountRef.current / uncachedUrls.length) * 100);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches to prevent overwhelming the browser
      if (i + batchSize < uncachedUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    setIsPreloading(false);
  }, [enabled, batchSize]);

  useEffect(() => {
    if (imageUrls.length > 0 && enabled) {
      const timer = setTimeout(() => {
        preloadImages(imageUrls);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [imageUrls, enabled, delay, preloadImages]);

  return {
    preloadProgress,
    isPreloading,
    preloadImages: (urls) => preloadImages(urls || imageUrls)
  };
};

/**
 * Hook for managing cache statistics and controls
 */
export const useImageCache = () => {
  const [stats, setStats] = useState(imageCache.getCacheStats());

  const updateStats = useCallback(() => {
    setStats(imageCache.getCacheStats());
  }, []);

  const clearCache = useCallback(() => {
    imageCache.clearCache();
    updateStats();
  }, [updateStats]);

  const removeFromCache = useCallback((imageUrl) => {
    imageCache.removeFromCache(imageUrl);
    updateStats();
  }, [updateStats]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [updateStats]);

  return {
    stats,
    clearCache,
    removeFromCache,
    updateStats
  };
};

export default useCachedImage;
