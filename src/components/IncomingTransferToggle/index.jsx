import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import IncomingOfferCard from "../IncomingOfferCard";
import { ChevronDownIcon } from "@heroicons/react/solid";
import { Button } from "antd";
import { Inbox, Mailbox } from "lucide-react";

const IncomingListToggle = ({
  title,
  incomingTransfers,
  onAction,
  myDisplayName,
  myOwnWalletAddress,
  updateUsersNFTs,
  widgetApi,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [incomingTransferOffers, setIncomingTransferOffers] = useState([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("IncomingListToggle useEffect triggered", incomingTransfers);
    if (incomingTransfers.length > 0) {
      const filteredTransfers = incomingTransfers.filter(
        (transfer) => transfer.offer.amount === "0"
      );
      setIncomingTransferOffers(filteredTransfers);
      setCount(filteredTransfers.length);
    } else {
      setIncomingTransferOffers([]);
      setCount(0);
    }
  }, [incomingTransfers]);

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white text-lg"><Mailbox /></span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {count} transfer{count !== 1 ? 's' : ''} incoming
            </p>
          </div>
        </div>
      </div>

      {count === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl"><Inbox /></span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            No incoming transfers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incomingTransferOffers.map((incomingTransfer, index) => (
            <IncomingOfferCard
              transfer={incomingTransfer}
              key={index}
              onAction={onAction}
              myWalletAddress={myOwnWalletAddress}
              updateUsersNFTs={updateUsersNFTs}
              widgetApi={widgetApi}
              myDisplayName={myDisplayName}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default IncomingListToggle;
