import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import OutgoingOfferCard from "../OutgoingOfferCard";
import { ChevronDownIcon } from "@heroicons/react/solid";
import { Button } from "antd";
import { Upload, Package } from "lucide-react";

const OutgoingTransferToggle = ({
  title,
  outgoingTransfers,
  onAction,
  myOwnWalletAddress,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [transfers, setOutgoingTransferOffers] = useState([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("🔄 OutgoingTransferToggle: outgoingTransfers updated:", outgoingTransfers);
    
    if (outgoingTransfers && outgoingTransfers.length > 0) {
      const filteredTransfers = outgoingTransfers.filter(
        (transfer) => {
          const isTransfer = transfer.offer && transfer.offer.amount === "0";
          console.log("🔍 Checking transfer:", {
            offerId: transfer.offer?.offerId,
            amount: transfer.offer?.amount,
            isTransfer,
            nftName: transfer.nft?.metadata?.name
          });
          return isTransfer;
        }
      );
      
      console.log("✅ Filtered transfers:", filteredTransfers);
      setOutgoingTransferOffers(filteredTransfers);
      setCount(filteredTransfers.length);
    } else {
      console.log("❌ No outgoing transfers found");
      setOutgoingTransferOffers([]);
      setCount(0);
    }
  }, [outgoingTransfers]);

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
            <Upload className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {count} transfer{count !== 1 ? 's' : ''} outgoing
            </p>
          </div>
        </div>
      </div>

      {count === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="text-gray-400 w-8 h-8" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            No outgoing transfers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transfers.map((outgoingTransfer, index) => (
            <OutgoingOfferCard
              transfer={outgoingTransfer}
              key={index}
              onAction={onAction}
              myWalletAddress={myOwnWalletAddress}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OutgoingTransferToggle;
