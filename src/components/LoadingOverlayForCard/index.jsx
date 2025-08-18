import React from "react";
import { Loader2 } from "lucide-react";

const LoadingOverlayForCard = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <span className="text-gray-900 dark:text-white font-medium text-lg">
        Loading...
      </span>
      <Loader2 className="animate-spin text-gray-900 dark:text-white w-5 h-5" />
    </div>
  );
};

export default LoadingOverlayForCard;
