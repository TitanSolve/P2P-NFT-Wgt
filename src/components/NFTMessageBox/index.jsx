import React from "react";
import { Modal, Box, Typography, Button } from "@mui/material";
import { AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";

const iconMap = {
  warning: <AlertTriangle className="text-orange-500 w-8 h-8" />,
  error: <XCircle className="text-red-500 w-8 h-8" />,
  success: <CheckCircle2 className="text-green-500 w-8 h-8" />,
  info: <Info className="text-blue-500 w-8 h-8" />,
};

const colorMap = {
  warning: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
};

const buttonColorMap = {
  warning: "bg-orange-500 hover:bg-orange-600 text-white",
  error: "bg-red-500 hover:bg-red-600 text-white",
  success: "bg-green-500 hover:bg-green-600 text-white",
  info: "bg-blue-500 hover:bg-blue-600 text-white",
};

const NFTMessageBox = ({ isOpen, onClose, type, message }) => {
    return (
      <Modal open={isOpen} onClose={onClose}>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="relative">
            {/* Backdrop blur */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl"></div>
            
            {/* Modal content */}
            <Box className={`relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border ${colorMap[type] || colorMap.info} w-full max-w-md mx-auto text-center`}>
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${colorMap[type] || colorMap.info}`}>
                  {iconMap[type] || iconMap.info}
                </div>
              </div>

              {/* Title */}
              <Typography variant="h5" className="font-bold text-gray-900 dark:text-white mb-4">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Typography>

              {/* Message */}
              <Typography variant="body1" className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                {message}
              </Typography>

              {/* Button */}
              <Button
                variant="contained"
                onClick={onClose}
                className={`${buttonColorMap[type] || buttonColorMap.info} w-full px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200`}
                sx={{
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  padding: '12px 24px',
                  borderRadius: '12px',
                }}
              >
                Got it
              </Button>
            </Box>
          </div>
        </div>
      </Modal>
    );
  };

export default NFTMessageBox;