import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import OfferReceivedCard from "../OfferReceivedCard";
import { ChevronDownIcon, XIcon } from "@heroicons/react/solid";
import { Button } from "antd";
import { Download, Package } from "lucide-react";

const OfferReceivedToggle = ({
  title,
  madeOffers,
  receivedOffers,
  onAction,
  myDisplayName,
  myOwnWalletAddress,
  refreshSellOffers,
  updateUsersNFTs,
  widgetApi,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [buyOffers, setBuyOffers] = useState([]);
  const [sellOffers, setSellOffers] = useState([]);
  const [count, setCount] = useState(0);
  const [roomMessage, setRommMessage] = useState("");
  const [sendRoomMsg, setSendRoomMsg] = useState(false);

  useEffect(() => {
    if (sendRoomMsg && roomMessage !== "") {
      console.log("sendRoomMsg", sendRoomMsg);
      widgetApi.sendRoomEvent("m.room.message", {
        body: roomMessage,
      });
    }
  }, [sendRoomMsg]);

  useEffect(() => {
    console.log("OfferReceivedToggle->receivedOffers-->", receivedOffers);
    if (receivedOffers.length > 0) {
      const filteredTransfers = receivedOffers.filter(
        (transfer) => transfer.offer.amount !== "0"
      );
      setBuyOffers(filteredTransfers);
      setCount(filteredTransfers.length);
      console.log("OfferReceivedToggle->buyOffer-->", filteredTransfers);
    } else {
      setBuyOffers([]);
      setCount(0);
    }
  }, [receivedOffers]);

  useEffect(() => {
    setSellOffers(madeOffers);
  }, [madeOffers]);

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
            <Download className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {count} offer{count !== 1 ? 's' : ''} received
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
            No offers received yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {buyOffers.map((offer, index) => (
            <OfferReceivedCard
              sellOffers={sellOffers}
              buyOffer={offer}
              key={index}
              onAction={onAction}
              myWalletAddress={myOwnWalletAddress}
              myDisplayName={myDisplayName}
              refreshSellOffers={refreshSellOffers}
              updateUsersNFTs={updateUsersNFTs}
              widgetApi={widgetApi}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OfferReceivedToggle;
