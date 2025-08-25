/**
 * Image Cache Service
 * Provides centralized image caching to prevent images from disappearing during navigation
 */

class ImageCacheService {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.preloadCanvas = null;
    this.maxCacheSize = 500; // Maximum number of cached images
    this.accessOrder = new Map(); // Track access order for LRU eviction
    
    // Initialize canvas for preloading
    this.initPreloadCanvas();
  }

  initPreloadCanvas() {
    if (typeof document !== 'undefined') {
      this.preloadCanvas = document.createElement('canvas');
      this.preloadCanvas.width = 1;
      this.preloadCanvas.height = 1;
    }
  }

  /**
   * Get cached image URL or initiate loading
   * @param {string} imageUrl - Original image URL
   * @param {string} fallbackUrl - Fallback image URL
   * @returns {Promise<string>} - Cached blob URL or original URL
   */
  async getCachedImage(imageUrl, fallbackUrl = null) {
    if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'undefined' || imageUrl === 'null') {
      console.log(`🚫 Invalid image URL: ${imageUrl}, using fallback: ${fallbackUrl}`);
      return fallbackUrl;
    }

    // For local images (like import paths), return them directly without caching
    if (imageUrl.startsWith('/') || imageUrl.startsWith('data:') || imageUrl.includes('static/media/')) {
      // console.log(`📁 Local image detected, using directly: ${imageUrl}`);
      return imageUrl;
    }

    // For CDN URLs that might have CORS issues, use direct URL instead of caching
    if (imageUrl.includes('cdn.bithomp.com') || imageUrl.includes('gateway.pinata.cloud')) {
      // console.log(`🌐 CDN image detected, using directly: ${imageUrl}`);
      return imageUrl;
    }

    // If the image URL is the same as fallback, return it directly
    if (imageUrl === fallbackUrl) {
      // console.log(`🔄 Image URL same as fallback, using directly: ${imageUrl}`);
      return imageUrl;
    }

    // Check if already cached
    if (this.cache.has(imageUrl)) {
      this.updateAccessOrder(imageUrl);
      const cached = this.cache.get(imageUrl);
      // console.log(`✅ Image cache hit: ${imageUrl}`);
      return cached;
    }

    // Check if already loading
    if (this.loadingPromises.has(imageUrl)) {
      // console.log(`⏳ Image already loading: ${imageUrl}`);
      return this.loadingPromises.get(imageUrl);
    }

    // Start loading and caching
    // console.log(`🔄 Starting to cache image: ${imageUrl}`);
    const loadingPromise = this.loadAndCacheImage(imageUrl, fallbackUrl);
    this.loadingPromises.set(imageUrl, loadingPromise);

    try {
      const cachedUrl = await loadingPromise;
      this.loadingPromises.delete(imageUrl);
      return cachedUrl;
    } catch (error) {
      this.loadingPromises.delete(imageUrl);
      console.warn(`❌ Failed to cache image ${imageUrl}:`, error);
      return fallbackUrl || imageUrl;
    }
  }

  /**
   * Load image and create cached blob URL
   * @param {string} imageUrl - Original image URL
   * @param {string} fallbackUrl - Fallback image URL
   * @returns {Promise<string>} - Cached blob URL
   */
  async loadAndCacheImage(imageUrl, fallbackUrl) {
    try {
      // Fetch the image with CORS mode for cacheable images
      const response = await fetch(imageUrl, {
        mode: 'cors',
        cache: 'force-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      
      // Create blob URL
      const blobUrl = URL.createObjectURL(blob);
      
      // Cache the blob URL
      this.setCachedImage(imageUrl, blobUrl);
      
      return blobUrl;
    } catch (error) {
      console.warn(`Failed to load image ${imageUrl}, using fallback:`, error);
      
      // If we have a fallback, try to cache that instead
      if (fallbackUrl && fallbackUrl !== imageUrl) {
        try {
          return await this.loadAndCacheImage(fallbackUrl, null);
        } catch (fallbackError) {
          console.warn(`Fallback image also failed:`, fallbackError);
        }
      }
      
      // Return original URL as last resort
      return imageUrl;
    }
  }

  /**
   * Set cached image with LRU eviction
   * @param {string} imageUrl - Original image URL
   * @param {string} cachedUrl - Cached blob URL
   */
  setCachedImage(imageUrl, cachedUrl) {
    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(imageUrl, cachedUrl);
    this.updateAccessOrder(imageUrl);
  }

  /**
   * Update access order for LRU tracking
   * @param {string} imageUrl - Image URL
   */
  updateAccessOrder(imageUrl) {
    this.accessOrder.delete(imageUrl);
    this.accessOrder.set(imageUrl, Date.now());
  }

  /**
   * Evict least recently used images
   */
  evictLeastRecentlyUsed() {
    // Find the oldest accessed image
    let oldestUrl = null;
    let oldestTime = Infinity;

    for (const [url, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      const cachedUrl = this.cache.get(oldestUrl);
      if (cachedUrl && cachedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cachedUrl);
      }
      this.cache.delete(oldestUrl);
      this.accessOrder.delete(oldestUrl);
    }
  }

  /**
   * Preload images in background
   * @param {string[]} imageUrls - Array of image URLs to preload
   */
  async preloadImages(imageUrls) {
    const validUrls = imageUrls.filter(url => 
      url && 
      url.trim() !== '' && 
      url !== 'undefined' && 
      url !== 'null' &&
      !this.cache.has(url) && 
      !this.loadingPromises.has(url) &&
      // Skip CDN URLs that we don't cache due to CORS issues
      !url.includes('cdn.bithomp.com') &&
      !url.includes('gateway.pinata.cloud')
    );
    
    const preloadPromises = validUrls
      .slice(0, 10) // Limit concurrent preloads
      .map(async (url) => {
        try {
          console.log(`🖼️ Preloading image: ${url}`);
          const result = await this.getCachedImage(url);
          console.log(`✅ Preloaded successfully: ${url}`);
          return result;
        } catch (error) {
          console.warn(`❌ Failed to preload: ${url}`, error);
          return null;
        }
      });

    if (preloadPromises.length > 0) {
      console.log(`� Starting preload of ${preloadPromises.length} images from ${imageUrls.length} total`);
      const results = await Promise.allSettled(preloadPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      console.log(`📊 Preload complete: ${successful}/${preloadPromises.length} successful`);
    } else {
      console.log(`ℹ️ No new images to preload from ${imageUrls.length} provided URLs (most are CDN images)`);
    }
  }

  /**
   * Clear all cached images
   */
  clearCache() {
    // Revoke all blob URLs to free memory
    for (const cachedUrl of this.cache.values()) {
      if (cachedUrl && cachedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cachedUrl);
      }
    }
    
    this.cache.clear();
    this.accessOrder.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      loadingCount: this.loadingPromises.size,
      usage: (this.cache.size / this.maxCacheSize * 100).toFixed(1) + '%'
    };
  }

  /**
   * Check if image is cached
   * @param {string} imageUrl - Image URL to check
   * @returns {boolean} True if cached
   */
  isCached(imageUrl) {
    return this.cache.has(imageUrl);
  }

  /**
   * Remove specific image from cache
   * @param {string} imageUrl - Image URL to remove
   */
  removeFromCache(imageUrl) {
    const cachedUrl = this.cache.get(imageUrl);
    if (cachedUrl && cachedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cachedUrl);
    }
    this.cache.delete(imageUrl);
    this.accessOrder.delete(imageUrl);
  }
}

// Create singleton instance
const imageCache = new ImageCacheService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    imageCache.clearCache();
  });
}

export default imageCache;
