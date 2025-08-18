import React from "react";
import { Loader2 } from "lucide-react";

const LoadingOverlay = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-50">
      <div className="flex items-center gap-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl px-6 py-4 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
        <span className="text-gray-900 dark:text-white font-medium text-lg">{message}</span>
        <Loader2 className="animate-spin text-gray-900 dark:text-white w-5 h-5" />
      </div>
    </div>
  );
};

export default LoadingOverlay;