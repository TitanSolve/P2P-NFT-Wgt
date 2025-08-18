import React, { useState } from "react";
import { Modal } from "@mui/material";
import { CheckCircle, XCircle, Loader2, QrCode } from "lucide-react";

const TransactionModal = ({
  isOpen,
  onClose,
  qrCodeUrl,
  transactionStatus,
}) => {
  const getStatusIcon = () => {
    if (transactionStatus.toLowerCase().includes("signed")) {
      return <CheckCircle className="text-green-500 w-5 h-5" />;
    }
    if (transactionStatus.toLowerCase().includes("rejected")) {
      return <XCircle className="text-red-500 w-5 h-5" />;
    }
    return <Loader2 className="animate-spin text-blue-500 w-5 h-5" />;
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md text-gray-900 dark:text-white rounded-2xl p-8 shadow-2xl w-full max-w-md mx-auto border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
              <QrCode className="text-white w-6 h-6" />
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-center mb-6 text-gray-900 dark:text-white">
            Scan QR to Sign Transaction
          </h2>

          {qrCodeUrl ? (
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200/50">
                <img
                  src={qrCodeUrl}
                  alt="Scan this QR code with XUMM"
                  className="max-w-[250px] rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-[200px] mb-6">
              <div className="bg-white/80 dark:bg-gray-700/80 rounded-xl p-6 shadow-lg">
                <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-4 py-3 rounded-xl">
              {getStatusIcon()}
              <span className="font-medium text-gray-900 dark:text-white">
                {transactionStatus || "Waiting for signature..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TransactionModal;