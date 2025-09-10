import React, { useEffect, useState, useRef } from "react";
import API_URLS from "../../config";
import TransactionModal from "../TransactionModal";
import NFTMessageBox from "../NFTMessageBox";
import {X} from "lucide-react";
import nft_pic from "../../assets/nft.png";

const OutgoingOfferCard = ({ transfer, index, onAction, myWalletAddress }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [websocketUrl, setWebsocketUrl] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [isMessageBoxVisible, setIsMessageBoxVisible] = useState(false);
  const [messageBoxType, setMessageBoxType] = useState("success");
  const [messageBoxText, setMessageBoxText] = useState("");

  const wsRef = useRef(null);

  const safeParse = (v) => {
    try { return JSON.parse(v); } catch { return v; }
  };

  const closeQrModal = (statusText, toastText, toastType = "error") => {
    console.log('closeQRModal', { statusText, toastText, toastType });
    setTransactionStatus(statusText || "");
    setIsQrModalVisible(false);
    try { wsRef.current?.close(); } catch { }
    wsRef.current = null;
    if (toastText) {
      setMessageBoxType(toastType);
      setMessageBoxText(toastText);
      setIsMessageBoxVisible(true);
    }
  };


  async function onRejectTransfer() {
    console.log("onRejectTransfer for item:", transfer);
    const requestBody = {
      account: myWalletAddress,
      offerId: transfer.offer.offerId,
    };
    console.log("requestBody:", requestBody);
    try {
      const response = await fetch(
        `${API_URLS.backendUrl}/cancel-nft-offer-with-sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );
      console.log(requestBody, "requestBody");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // setIsQrModalVisible(false);

      const data = await response.json();
      if (data) {
        if (data?.result === "NotEnoughCredit") {
          setMessageBoxType("error");
          setMessageBoxText(
            "You don't have enough mCredits to create this offer.\nPlease buy more mCredits."
          );
          setIsMessageBoxVisible(true);
          return;
        }

        console.log(data.refs, "data refs");
        setQrCodeUrl(data.refs.qr_png);
        setWebsocketUrl(data.refs.websocket_status);
        setIsQrModalVisible(true);
        // onAction();
      }
    } catch (error) {
      console.error("Error during fetch:", error);
    }
  }

  useEffect(() => {
    if (!websocketUrl) return;

    console.log("Setting up WebSocket connection to:", websocketUrl);

    // Close any previous socket
    try { wsRef.current?.close(); } catch { }
    const ws = new WebSocket(websocketUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = safeParse(event.data || "");
      console.log("WebSocket message received:", msg);

      // Some gateways send plain strings for simple states
      if (typeof msg === "string") {
        if (/declin|reject|cancel|close|abort|deny|expire/i.test(msg)) {
          closeQrModal("Transaction cancelled", "Transaction was cancelled/declined.");
        }
        return;
      }

      if (msg?.signed === true) {
        closeQrModal("Transaction signed", "Transaction completed successfully!", "success");
        const requestBody = {
          account: myWalletAddress,
          offerType: "accept_transfer_offer",
        };
        console.log("requestBody for mCredit deduction:", requestBody);
        const response = fetch(`${API_URLS.backendUrl}/deduct-mCredit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
        console.log("deduction result:", response);
        // onAction?.();
        return;
      } else if (msg?.rejected) {
        const why = (msg?.reason || "Declined").toString().toLowerCase();
        closeQrModal("Transaction declined", `Transaction was ${why}.`);
        return;
      }

            // Extra guards for alternate shapes
      if (msg?.cancelled || msg?.canceled || msg?.expired) {
        closeQrModal("Transaction cancelled", /*"Transaction was cancelled/expired."*/);
        return;
      }
    };

    ws.onerror = () => {
      // Treat errors as a cancelled flow but don't spam
      console.log("WebSocket error occurred");
      closeQrModal("Connection error", /*"Wallet connection error. Please try again."*/ "");
      return;
    };

    ws.onclose = () => {
      // If the QR modal is still open with no resolution, close gracefully
      console.log("WebSocket connection closed");
      if (isQrModalVisible) {
        closeQrModal("Connection closed", /*"Wallet connection closed."*/ "");
        return;
      }
    };

    return () => {
      console.log("Cleaning up WebSocket connection");
      // try { ws.close(); } catch { }
      wsRef.current = null;
    };
  }, [websocketUrl/*, isQrModalVisible, onAction*/]);

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <img
          src={transfer.nft.imageURI || nft_pic}
          alt={`NFT`}
          className="w-full md:w-40 h-auto rounded-xl object-cover shadow-lg border border-gray-200/50 dark:border-gray-700/50"
        />

        <div className="flex-1 space-y-3 text-center md:text-left">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            NFT Name:{" "}
            <span className="text-sm font-mono break-all">
              {transfer.nft.metadata.name ? transfer.nft.metadata.name : ""}
            </span>
          </p>
          <p className="text-sm px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 w-fit mx-auto md:mx-0 border border-purple-200 dark:border-purple-800">
            Outgoing Transfer
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onRejectTransfer}
            className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
      <TransactionModal
        isOpen={isQrModalVisible}
        onClose={() => setIsQrModalVisible(false)}
        qrCodeUrl={qrCodeUrl}
        transactionStatus={transactionStatus}
      />
      <NFTMessageBox
        isOpen={isMessageBoxVisible}
        onClose={() => setIsMessageBoxVisible(false)}
        type={messageBoxType}
        message={messageBoxText}
      />
    </div>
    // <motion.div
    //   initial={{ opacity: 0, y: 10 }}
    //   animate={{ opacity: 1, y: 0 }}
    //   className="flex flex-col sm:flex-row items-center sm:justify-between bg-white dark:bg-[#15191E] p-4 rounded-xl shadow-md w-full max-w-2xl border border-gray-200 dark:border-gray-700 space-y-4 sm:space-y-0 sm:space-x-4 transition-colors"
    // >
    //   <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
    //     <img
    //       src={transfer.nft.imageURI}
    //       alt="TextRP Feature Pack"
    //       className="w-16 h-16 rounded-lg object-cover shadow-sm"
    //     />
    //     <div className="flex flex-col text-center sm:text-left overflow-hidden">
    //       <span className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg truncate w-full">
    //         {transfer.nft.name}
    //       </span>
    //       {/* <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-base truncate w-full">Exclusive NFT Collection TextRP Feature Pack TextRP Feature Pack TextRP Feature Pack</span> */}
    //     </div>
    //   </div>
    //   <div className="flex flex-col items-center sm:items-end text-center sm:text-right w-full sm:w-auto">
    //     <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-base sm:whitespace-nowrap">
    //       Outgoing Transfer Offer
    //     </span>
    //   </div>
    //   <div className="flex flex-col sm:flex-row items-center justify-between w-full sm:w-auto space-y-4 sm:space-y-0 sm:space-x-4">
    //     <Button
    //       type="primary"
    //       onClick={onRejectTransfer}
    //       block
    //       style={{ borderRadius: "6px", alignItems: "center" }}
    //       className="dark:bg-green-600 dark:hover:bg-green-500"
    //       // className="w-full sm:w-auto bg-red-500 text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-red-600 transition shadow-md text-center">
    //     >
    //       Cancel
    //     </Button>
    //   </div>
    //   <TransactionModal
    //     isOpen={isQrModalVisible}
    //     onClose={() => setIsQrModalVisible(false)}
    //     qrCodeUrl={qrCodeUrl}
    //     transactionStatus={transactionStatus}
    //   />
    // </motion.div>
  );
};

export default OutgoingOfferCard;
