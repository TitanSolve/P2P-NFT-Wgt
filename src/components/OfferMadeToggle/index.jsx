import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import OfferMadeCard from "../OfferMadeCard";
import { ChevronDownIcon, XIcon } from "@heroicons/react/solid";
import { Button } from "antd";
import { Send, Package } from "lucide-react";

const OfferMadeToggle = ({
  title,
  madeOffers,
  onAction,
  myOwnWalletAddress,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [sellOffers, setSellOffers] = useState([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (madeOffers.length > 0) {
      const filteredTransfers = madeOffers.filter(
        (transfer) => transfer.offer.amount !== "0"
      );
      setSellOffers(filteredTransfers);
      setCount(filteredTransfers.length);
      console.log("OfferMadeToggle-->sellOffer-->", filteredTransfers);
    } else {
      setSellOffers([]);
      setCount(0);
    }
  }, [madeOffers]);

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
            <Send className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {count} offer{count !== 1 ? 's' : ''} made
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
            You have no made offers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sellOffers.map((offer, index) => (
            <OfferMadeCard
              sellOffer={offer}
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
export default OfferMadeToggle;
