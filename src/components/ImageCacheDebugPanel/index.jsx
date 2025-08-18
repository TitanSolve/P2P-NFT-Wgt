import React from 'react';
import { useImageCache } from '../../hooks/useCachedImage';

const ImageCacheDebugPanel = ({ visible = false }) => {
  const { stats, clearCache } = useImageCache();

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl p-4 shadow-lg border border-gray-200/50 dark:border-gray-700/50 z-50 min-w-64">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Image Cache
        </h3>
        <button
          onClick={clearCache}
          className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded border border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          Clear
        </button>
      </div>
      
      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex justify-between">
          <span>Cached Images:</span>
          <span className="font-mono">{stats.size}</span>
        </div>
        <div className="flex justify-between">
          <span>Cache Usage:</span>
          <span className="font-mono">{stats.usage}</span>
        </div>
        <div className="flex justify-between">
          <span>Loading:</span>
          <span className="font-mono">{stats.loadingCount}</span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div 
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: stats.usage }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageCacheDebugPanel;
