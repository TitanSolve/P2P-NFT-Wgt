import React, { useEffect, useState } from "react";
import API_URLS from "../../config";
import { Button } from "antd";
import TransactionModal from "../TransactionModal";
import LoadingOverlayForCard from "../LoadingOverlayForCard";
import NFTMessageBox from "../NFTMessageBox";
import { DollarSign, User, X } from "lucide-react";

const OfferMadeCard = ({ sellOffer, index, onAction, myWalletAddress }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isMessageBoxVisible, setIsMessageBoxVisible] = useState(false);
  const [messageBoxType, setMessageBoxType] = useState("success");
  const [messageBoxText, setMessageBoxText] = useState("");
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

  async function onCancelOffer() {
    console.log("Cancel clicked for item:", sellOffer);
    const requestBody = {
      owner: myWalletAddress,
      // account: sellOffer.offer.offerOwner,
      offerId: sellOffer.offer.offerId,
    };
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URLS.backendUrl}/cancel-nft-offer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      console.log(requestBody, "requestBody");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(data, "data received from server");

      if (data?.result === "NotEnoughCredit") {
        setMessageBoxType("error");
        setMessageBoxText(
          "You don't have enough mCredits to create this offer.\nPlease buy more mCredits."
        );3
        setIsMessageBoxVisible(true);
        return;
      }

      setIsLoading(false);
      if (data.result.meta.TransactionResult === "tesSUCCESS") {
        console.log(data, "returned data");
        setMessageBoxType("success");
        setMessageBoxText("Offer cancelled successfully.");
        setIsMessageBoxVisible(true);
        // onAction();
      } else {
        console.log("No data received from the server.");
        setMessageBoxType("error");
        setMessageBoxText(
          "Failed to cancel the offer. \nPlease try again.\n error: " +
            data.result.meta.TransactionResult
        );
        setIsMessageBoxVisible(true);
      }
    } catch (error) {
      console.error("Error during fetch:", error);
    }
  }

  return (
    <>
      {isLoading ? (
        <LoadingOverlayForCard />
      ) : (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* NFT Image */}
            <div className="relative flex-shrink-0">
              <img
                src={sellOffer.nft.imageURI}
                alt={`NFT`}
                className="w-48 h-48 rounded-2xl object-cover shadow-lg border border-gray-200/50 dark:border-gray-700/50"
              />
              <div className="absolute -top-2 -right-2">
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  sellOffer.offer.isSell 
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' 
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                }`}>
                  <span className="w-2 h-2 bg-current rounded-full mr-1.5 inline-block"></span>
                  {sellOffer.offer.isSell ? "Sell Offer" : "Buy Offer"}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {sellOffer.nft.metadata?.name || "Unnamed NFT"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono break-all">
                  ID: {sellOffer.nft.nftokenID}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                    <DollarSign className="text-white w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Offer Amount</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {(sellOffer.offer.amount * 1) / 1000000} XRP
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                    <User className="text-white w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Offer Owner</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {sellOffer.offer.offerOwnerName || "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <button
                onClick={onCancelOffer}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <X className="w-4 h-4" />
                <span>Cancel Offer</span>
              </button>
            </div>
          </div>
          <NFTMessageBox
            isOpen={isMessageBoxVisible}
            onClose={() => setIsMessageBoxVisible(false)}
            type={messageBoxType}
            message={messageBoxText}
          />
        </div>
      )}
    </>
  );
};

export default OfferMadeCard;
