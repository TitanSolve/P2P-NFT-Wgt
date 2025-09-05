import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, User, Users, Filter, Palette } from "lucide-react";
import axios from "axios";
import {
  Typography,
  Select,
  MenuItem,
  Switch,
  Modal,
  Box,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Button,
  InputAdornment,
} from "@mui/material";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import NFTCard from "../NFT-Card";
import "./index.css";
import API_URLS from "../../config";
import TransactionModal from "../TransactionModal";
import NFTMessageBox from "../NFTMessageBox";
import LoadingOverlayForCard from "../LoadingOverlayForCard";

const decodeCurrency = (currency) => {
  try {
    // Return standard 3-letter codes directly
    if (currency.length <= 3) return currency;

    // Check if it's a 40-char hex string
    const isHex = /^[A-Fa-f0-9]{40}$/.test(currency);
    if (!isHex) return currency;

    // Attempt to decode buffer to ASCII
    const buf = Buffer.from(currency, "hex");
    const ascii = buf.toString("ascii").replace(/\0/g, "").trim();

    // If the decoded value is printable ASCII, return it
    const isPrintable = /^[\x20-\x7E]+$/.test(ascii);
    return isPrintable ? ascii : currency;
  } catch (e) {
    return currency;
  }
};

const ParticipantCard = ({
  index,
  membersList,
  myNftData,
  wgtParameters,
  getImageData,
  refreshOffers,
  widgetApi,
  loadCollectionNFTs,
  loadingCollections,
}) => {
  const [state, setState] = useState({
    sortOrder: "newest",
    isSell: true,
    isOldest: true,
    selectedUser: "all",
    amount: "1",
    collection: "collection",
    selectedCollection: "",
    token: "XRP",
  });

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedNFTGroup, setSelectedNFTGroup] = useState(null);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedNftForOffer, setSelectedNftForOffer] = useState(null);
  const [uniqueCurrencies, setUniqueCurrencies] = useState([]);
  const [createdOfferType, setCreatedOfferType] = useState("create_buy_offer");
  const [websocketUrl, setWebsocketUrl] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [isMessageBoxVisible, setIsMessageBoxVisible] = useState(false);
  const [messageBoxType, setMessageBoxType] = useState("success");
  const [messageBoxText, setMessageBoxText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [roomMessage, setRoomMessage] = useState("");
  const [sendRoomMsg, setSendRoomMsg] = useState(false);

  useEffect(() => {
    if (sendRoomMsg && roomMessage !== "") {
      console.log("sendRoomMsg", sendRoomMsg);
      widgetApi.sendRoomEvent("m.room.message", {
        body: roomMessage,
      });
    }
  }, [sendRoomMsg]);

  const toggleSellMode = () =>
    setState((prev) => ({ ...prev, isSell: !prev.isSell }));
  const updateField = (field, value) =>
    setState((prev) => ({ ...prev, [field]: value }));

  const filteredNfts = myNftData.groupedNfts.filter(
    (group) =>
      group.collection === state.selectedCollection ||
      state.selectedCollection === ""
  );

  const responsive = {
    superLargeDesktop: { breakpoint: { max: 4000, min: 1280 }, items: 4 },
    desktop: { breakpoint: { max: 1280, min: 700 }, items: 3 },
    tablet: { breakpoint: { max: 700, min: 400 }, items: 2 },
    mobile: { breakpoint: { max: 400, min: 0 }, items: 1 },
  };

  const openPreviewModal = async (group) => {
    // If NFTs are not loaded yet, load them
    if (group.nfts.length === 0 && group.nftCount > 0) {
      setIsLoading(true);
      try {
        await loadCollectionNFTs(
          myNftData.walletAddress,
          group.collection,
          myNftData.name,
          myNftData.userId,
          group.issuer,
          group.nftokenTaxon
        );
      } catch (error) {
        console.error("Error loading collection NFTs:", error);
      } finally {
        setIsLoading(false);
      }
    }

    // After loading, get the updated group data by collectionKey or collection name
    const updatedGroup = myNftData.groupedNfts.find(g => 
      (g.collectionKey && g.collectionKey === group.collectionKey) ||
      (g.issuer === group.issuer && g.nftokenTaxon === group.nftokenTaxon) ||
      g.collection === group.collection
    );
    
    if (updatedGroup && updatedGroup.nfts.length > 1) {
      setSelectedNFTGroup(updatedGroup);
      console.log("selectedGroup--->", updatedGroup);
      setPreviewModalOpen(true);
    } else if (updatedGroup && updatedGroup.nfts.length === 1) {
      openOfferModal(updatedGroup.nfts[0]);
    }
  };

  const closePreviewModal = () => {
    setPreviewModalOpen(false);
    setSelectedNFTGroup(null);
  };

  const openOfferModal = async (nft) => {
    setIsLoading(true);
    const xrpl = require("xrpl");
    const client = new xrpl.Client(API_URLS.xrplMainnetUrl); // mainnet
    await client.connect();

    const response = await client.request({
      command: "account_lines",
      account: nft.issuer,
    });
    console.log("-------Account lines: ", response);
    const decodedLines = response.result.lines.map((line) => ({
      ...line,
      currency: line.currency,
      decodedCurrency: decodeCurrency(line.currency),
    }));

    console.log("decodedLines", decodedLines);

    await client.disconnect();

    const myName = wgtParameters.displayName;
    const own = membersList.find((u) => u.name === myName /*"This Guy"*/);
    const currentUser = membersList.find((u) => u.name === nft.userName);
    const myTrustLines = own.trustLines;
    const currentUserTrustLines = currentUser.trustLines;
    const sharedTrustLines = myTrustLines.filter((myLine) =>
      currentUserTrustLines.some(
        (theirLine) =>
          theirLine.currency === myLine.currency &&
          theirLine.account === myLine.account
      )
    );
    console.log("sharedTrustLines", sharedTrustLines);
    let unique = Array.from(
      new Map(
        sharedTrustLines.map((line) => [
          `${line.account}_${line.currency}`,
          {
            account: line.account,
            currency: line.currency,
            decodedCurrency: line.decodedCurrency,
          },
        ])
      ).values()
    );

    // 2. Filter and map to only 'currency' and 'decodedCurrency'
    const overlapped = decodedLines
      .filter((line) =>
        unique.some(
          (u) => u.account === line.account && u.currency === line.currency
        )
      )
      .map((line) => ({
        currency: line.currency,
        decodedCurrency: line.decodedCurrency,
      }));

    console.log("Overlapped trust lines (currency only):", overlapped);

    const hasXRP = overlapped.some((item) => item.decodedCurrency === "XRP");
    if (!hasXRP) {
      overlapped.push({ currency: "XRP", decodedCurrency: "XRP" });
    }
    setUniqueCurrencies(overlapped);
    setSelectedNftForOffer(nft);
    setIsLoading(false);
    setOfferModalOpen(true);
  };

  const closeOfferModal = () => {
    setOfferModalOpen(false);
    setSelectedNftForOffer(null);
  };

  const makeOffer = async (isSell, selectedNftForOffer) => {
    console.log("isSell : ", isSell);
    console.log("selectedNftForOffer : ", selectedNftForOffer);
    const myName = wgtParameters.displayName;
    const own = membersList.find((u) => u.name === myName);
    const ownWalletAddress = own?.userId?.split(":")[0].replace("@", "");
    let destination = state.selectedUser;
    let decodedCurrency = state.token;
    const myTrustLines = own.trustLines;
    const currentCurrency = myTrustLines.find(
      (line) => line.decodedCurrency === decodedCurrency
    );

    console.log("decodedCurrency", decodedCurrency);
    console.log("myTrustLines", myTrustLines);
    console.log("currentCurrency", currentCurrency);

    setTransactionStatus("");
    if (destination !== "all") {
      destination = membersList
        .find((u) => u.name === destination)
        .userId?.split(":")[0]
        .replace("@", "");
    }
    if (isSell) {
      if (selectedNftForOffer.userName === wgtParameters.displayName) {
        //Create Sell Offer
        setCreatedOfferType("create_sell_offer");
        let offerAmount;
        if (state.token === "XRP") {
          offerAmount = state.amount;
        } else {
          offerAmount = {
            currency: currentCurrency.currency,
            issuer: currentCurrency.account,
            value: state.amount,
            limit: currentCurrency.limit,
          };
        }
        console.log("offerAmount", offerAmount);

        const payload = {
          nft: selectedNftForOffer.nftokenID,
          amount: offerAmount,
          receiver: destination,
          sender: ownWalletAddress,
        };
        console.log("payload for sell", payload);
        try {
          setIsLoading(true);
          const response = await axios.post(
            `${API_URLS.backendUrl}/create-nft-offer`,
            payload
          );
          setIsLoading(false);

          if (response.data?.result === "NotEnoughCredit") {
            setMessageBoxType("error");
            setMessageBoxText(
              "You don't have enough mCredits to create this offer.\nPlease buy more mCredits."
            );
            setIsMessageBoxVisible(true);
            return;
          }

          if (response.data) {
            console.log("Offer created:", response.data);

            const msg = `🔔NFT Sell Offer Created\n ${selectedNftForOffer.assets.image}\n ${wgtParameters.displayName} has offered ${state.amount} ${state.token} to ${state.selectedUser}`;
            console.log("msg-->", msg);
            setRoomMessage(msg);

            setQrCodeUrl(response.data.refs.qr_png);
            setWebsocketUrl(response.data.refs.websocket_status);
            setIsQrModalVisible(true);
            setSell(false);
          } else {
            console.log("No data received from the server.");
            setMessageBoxType("error");
            setMessageBoxText(
              "No data received from the server.\n Please try again."
            );
            setIsMessageBoxVisible(true);
          }
        } catch (error) {
          console.error("Error creating offer:", error);
        }
      } //Create Buy Offer
      else {
        setCreatedOfferType("create_buy_offer");
        let offerAmount;
        if (state.token === "XRP") {
          offerAmount = (parseFloat(state.amount) * 1 + 0.000012).toFixed(6);
        } else {
          offerAmount = {
            currency: currentCurrency.currency,
            issuer: currentCurrency.account,
            value: state.amount,
          };
        }
        console.log("offerAmount", offerAmount);

        const payload = {
          nft: selectedNftForOffer.nftokenID,
          amount: offerAmount,
          account: ownWalletAddress,
          owner: myNftData.userId.split(":")[0].replace("@", ""),
        };

        console.log(payload, "payload in participant card");

        try {
          setIsLoading(true);
          const response = await fetch(
            `${API_URLS.backendUrl}/create-nft-buy-offer`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          setIsLoading(false);
          const data = await response.json();
          console.log("Success:", data);
          if (data) {
            if (data?.result === "NotEnoughCredit") {
              setMessageBoxType("error");
              setMessageBoxText(
                "You don't have enough mCredits to create this offer.\nPlease buy more mCredits."
              );
              setIsMessageBoxVisible(true);
              return;
            }

            const msg = `🔔NFT Buy Offer Created\n${wgtParameters.displayName} has offered ${state.amount} ${state.token} for ${selectedNftForOffer.metadata.name} to ${selectedNftForOffer.userName}`;
            console.log("msg-->", msg);
            setRoomMessage(msg);

            setQrCodeUrl(data.refs.qr_png);
            setWebsocketUrl(data.refs.websocket_status);
            setIsQrModalVisible(true);
          } else {
            console.log("No data received from the server.");
            setMessageBoxType("error");
            setMessageBoxText(
              "No data received from the server.\n Please try again."
            );
            setIsMessageBoxVisible(true);
          }
        } catch (error) {
          console.error("Error:", error);
        }
      }
    } else {
      //Create Transfer Offer
      setCreatedOfferType("create_transfer_offer");
      
      if (destination === "all") {
        setMessageBoxType("error");
        setMessageBoxText("Please select a user to transfer the NFT.");
        setIsMessageBoxVisible(true);
        return;
      }

      const payload = {
        nft: selectedNftForOffer.nftokenID,
        amount: "0",
        receiver: destination,
        sender: ownWalletAddress,
      };
      console.log("Transfer payload:", payload);

      try {
        setIsLoading(true);
        const response = await axios.post(
          `${API_URLS.backendUrl}/create-nft-offer`,
          payload
        );
        setIsLoading(false);
        console.log(response, "response aman in user card");

        if (response.data?.result === "NotEnoughCredit") {
          setMessageBoxType("error");
          setMessageBoxText(
            "You don't have enough mCredits to create this offer.\nPlease buy more mCredits."
          );
          setIsMessageBoxVisible(true);
          return;
        }

        const msg = `🔔NFT Transfer Offer Created\n${wgtParameters.displayName} has offered ${selectedNftForOffer.metadata.name} to ${state.selectedUser}`;
        console.log("msg-->", msg);
        setRoomMessage(msg);

        setQrCodeUrl(response.data.refs.qr_png);
        setWebsocketUrl(response.data.refs.websocket_status);
        setIsQrModalVisible(true);
        setTransfer(false);
        console.log("Transfer initiated:", response.data);
      } catch (error) {
        console.error("Error initiating transfer:", error);
      }
    }
  };

  useEffect(() => {
    if (websocketUrl) {
      console.log("websocketUrl in user card", websocketUrl);
      const ws = new WebSocket(websocketUrl);
      setSendRoomMsg(false);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(data, "data aman in user card qr code");
        const myName = wgtParameters.displayName;
        const own = membersList.find((u) => u.name === myName /*"This Guy"*/);
        const ownWalletAddress = own?.userId?.split(":")[0].replace("@", "");
        console.log("data in ws", data);
        if (data.signed === true) {
          const requestBody = {
            account: ownWalletAddress,
            offerType: createdOfferType,
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

          setTransactionStatus("Transaction signed.");
          setIsQrModalVisible(false);
          setMessageBoxType("success");
          setMessageBoxText("Offer created successfully.");
          setIsMessageBoxVisible(true);
          setSendRoomMsg(true);
          setPreviewModalOpen(false);
          setOfferModalOpen(false);
          ws.close();

          //update Offer List
          // refreshOffers();
          if (typeof refreshOffers === "function") {
            refreshOffers();
          } else {
            console.warn("refreshOffers is not a function", refreshOffers);
          }
        } else if (data.signed === false) {
          setIsQrModalVisible(false);
          ws.close();
        } else if (data.rejected) {
          setTransactionStatus("Transaction rejected");
          setIsQrModalVisible(false);
          setMessageBoxType("error");
          setMessageBoxText("Offer creation failed.");
          setIsMessageBoxVisible(true);
          ws.close();
        }
      };

      return () => {
        ws.close();
      };
    }
  }, [websocketUrl]);

  const collections = [
    ...new Set(myNftData.groupedNfts.map((group) => group.collection)),
  ];

  // Function to get display count for a collection
  const getCollectionDisplayCount = (group) => {
    if (group.nfts.length > 0) {
      return group.nfts.length;
    }
    return group.nftCount || 0;
  };

  return (
    <>
      {isLoading ? (
        <LoadingOverlayForCard />
      ) : (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">
                  {myNftData.name === wgtParameters.displayName ? <User className="w-6 h-6" /> : <Users className="w-6 h-6" /> }
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {myNftData.name === wgtParameters.displayName
                    ? "My Collection"
                    : myNftData.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredNfts.length} collection{filteredNfts.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>

            {/* Collection Filter */}
            <div className="flex items-center gap-3">
              <FormControl
                variant="outlined"
                size="small"
                className="w-80"
              >
                <InputLabel className="text-gray-700 dark:text-gray-300">
                  Filter Collection
                </InputLabel>
                <Select
                  value={state.selectedCollection}
                  onChange={(e) =>
                    updateField("selectedCollection", e.target.value)
                  }
                  label="Filter Collection"
                  className="select-field w-80"
                  MenuProps={{
                    PaperProps: {
                      className: "bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl",
                    },
                  }}
                >
                  <MenuItem value="">
                    <div className="flex items-center gap-2">
                      <Filter className="text-gray-500 w-4 h-4" />
                      <span>All Collections</span>
                    </div>
                  </MenuItem>
                  {collections.map((collection, idx) => (
                    <MenuItem key={idx} value={collection}>
                      <div className="flex items-center gap-2">
                        <Palette className="text-blue-500 w-4 h-4" />
                        <span>{collection}</span>
                      </div>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>

          {/* NFT Carousel */}
          <div className="relative">
            {filteredNfts.length > 0 ? (
              <Carousel
                responsive={responsive}
                ssr={true}
                infinite={false}
                draggable={true}
                containerClass="carousel-container"
                itemClass="carousel-item flex justify-center items-center px-3"
                customLeftArrow={
                  <button
                    className="absolute left-2 md:left-4 top-1/2 z-20 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md text-gray-700 dark:text-gray-300 shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-3 rounded-full hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={20} className="md:size-6" />
                  </button>
                }
                customRightArrow={
                  <button
                    className="absolute right-2 md:right-4 top-1/2 z-20 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md text-gray-700 dark:text-gray-300 shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-3 rounded-full hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    aria-label="Next"
                  >
                    <ChevronRight size={20} className="md:size-6" />
                  </button>
                }
              >
                {filteredNfts.map((groupedNft, idx) => {
                  const cacheKey = `${myNftData.walletAddress}-${groupedNft.collection}`;
                  const isLoadingThisCollection = loadingCollections[cacheKey];
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => openPreviewModal(groupedNft)}
                      className="cursor-pointer animate-fade-in relative"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      {isLoadingThisCollection && (
                        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
                          <div className="bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-lg flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Loading...</span>
                          </div>
                        </div>
                      )}
                      <NFTCard
                        myNftData={groupedNft}
                        isGroup={true}
                        isImgOnly={false}
                      />
                    </div>
                  );
                })}
              </Carousel>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🎨</span>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    No NFTs Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md">
                    {state.selectedCollection 
                      ? `No NFTs found in the "${state.selectedCollection}" collection`
                      : "This user doesn't have any NFTs to display"
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          <Modal
            open={previewModalOpen}
            onClose={closePreviewModal}
            footer={null}
            closable={true}
            maskClosable={true}
            bodyStyle={{ borderRadius: "10px", padding: "24px" }}
          >
            <Box className="absolute top-1/2 left-1/2 w-11/12 bg-white dark:bg-[#15191E] text-black dark:text-white rounded-2xl shadow-2xl transform -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6 md:p-8 outline-none border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <Typography
                variant="h6"
                className="font-bold overflow-hidden text-black dark:text-white"
              >
                {selectedNFTGroup &&
                  "Issuer : " + selectedNFTGroup.nfts[0].issuer}
              </Typography>
              <div className="relative">
                <Carousel
                  responsive={responsive}
                  ssr={true}
                  infinite={false}
                  draggable={true}
                  swipeable={true}
                  containerClass="carousel-container"
                  itemClass="carousel-item flex justify-center items-center px-2"
                  customLeftArrow={
                    <button className="absolute left-2 md:left-4 top-1/2 z-20 -translate-y-1/2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-lg p-2 md:p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200 ease-in-out">
                      <ChevronLeft size={20} />
                    </button>
                  }
                  customRightArrow={
                    <button className="absolute right-2 md:right-4 top-1/2 z-20 -translate-y-1/2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-lg p-2 md:p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200 ease-in-out">
                      <ChevronRight size={20} />
                    </button>
                  }
                >
                  {selectedNFTGroup &&
                    selectedNFTGroup.nfts.map((nft, idx) => (
                      <div
                        key={idx}
                        onClick={() => openOfferModal(nft)}
                        className="cursor-pointer hover:scale-105 transition-transform duration-300"
                      >
                        <NFTCard
                          myNftData={nft}
                          isGroup={false}
                          isImgOnly={false}
                        />
                      </div>
                    ))}
                </Carousel>
              </div>
            </Box>
          </Modal>

          <Modal
            open={offerModalOpen}
            onClose={closeOfferModal}
            footer={null}
            closable={true}
            maskClosable={true}
            closeAfterTransition
            bodyStyle={{ borderRadius: "10px", padding: "16px" }}
          >
            <div>
              {selectedNftForOffer !== null && (
                <Box className="bg-white dark:bg-[#15191E] text-black dark:text-white rounded-xl p-6 shadow-lg max-h-[90vh] max-w-full md:max-w-[500px] w-full mx-auto top-1/2 left-1/2 absolute transform -translate-x-1/2 -translate-y-1/2 overflow-y-auto transition-colors duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <Typography
                        variant="subtitle1"
                        className="font-semibold text-black dark:text-white"
                      >
                        {selectedNftForOffer.metadata.name}
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        className="text-sm text-gray-600 dark:text-gray-300"
                      >
                        Issuer: {selectedNftForOffer.issuer} -{" "}
                        {selectedNftForOffer.nftokenTaxon}
                      </Typography>
                    </div>
                    <Button
                      onClick={closeOfferModal}
                      className="min-w-[36px] h-[36px] text-black dark:text-white"
                      sx={{
                        fontSize: "1.2rem",
                        fontWeight: "bold",
                        lineHeight: 1,
                        padding: 0,
                        minHeight: "auto",
                      }}
                    >
                      ✕
                    </Button>
                  </div>

                  <NFTCard
                    myNftData={selectedNftForOffer}
                    isGroup={false}
                    isImgOnly={true}
                  />
                  <Typography
                    variant="subtitle2"
                    className="text-center font-semibold text-black dark:text-white"
                  >
                    IssuerFee : {(selectedNftForOffer.transferFee * 1) / 1000} %
                  </Typography>

                  {selectedNftForOffer.metadata?.attributes?.length > 0 && (
                    <div className="mb-6">
                      <Typography
                        variant="subtitle2"
                        className="font-semibold mb-2 text-black dark:text-white"
                      >
                        Attributes
                      </Typography>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {selectedNftForOffer.metadata.attributes.map(
                          (attr, idx) => (
                            <Box
                              key={index}
                              className="bg-gray-100 dark:bg-[#1c1f26] rounded-md p-3 w-full transition-colors"
                            >
                              <Typography className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                {attr.trait_type}
                              </Typography>
                              <Typography className="text-black dark:text-white font-semibold mb-1">
                                {attr.value}
                              </Typography>
                              {attr.rarity && (
                                <Chip
                                  label={`${attr.rarity}%`}
                                  size="small"
                                  sx={{
                                    backgroundColor: "#6c3df4",
                                    color: "white",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </Box>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {!(
                    selectedNftForOffer.userName === wgtParameters.displayName
                  ) && (
                    <Typography
                      variant="h5"
                      className="text-center font-semibold text-black dark:text-white"
                    >
                      Offer to buy from {selectedNftForOffer.userName}
                    </Typography>
                  )}

                  {selectedNftForOffer.userName ===
                    wgtParameters.displayName && (
                    <>
                      <div className="flex justify-center items-center gap-4">
                        <Typography
                          className={`font-medium ${
                            state.isSell
                              ? "text-black dark:text-white"
                              : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          Sell
                        </Typography>
                        <Switch
                          checked={!state.isSell}
                          onChange={toggleSellMode}
                          color="primary"
                        />
                        <Typography
                          className={`font-medium ${
                            !state.isSell
                              ? "text-black dark:text-white"
                              : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          Transfer
                        </Typography>
                      </div>

                      <Select
                        value={state.selectedUser}
                        onChange={(e) =>
                          updateField("selectedUser", e.target.value)
                        }
                        fullWidth
                        variant="outlined"
                        size="small"
                        className="mb-4 bg-white dark:bg-gray-800 dark:text-white rounded"
                        sx={{
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "gray",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "blue",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "green",
                          },
                          "& .MuiInputBase-input": {
                            color: "black",
                          },
                        }}
                      >
                        <MenuItem key={"all"} value={"all"}>
                          All Others
                        </MenuItem>
                        {membersList.map((user) =>
                          user.name !== wgtParameters.displayName ? (
                            <MenuItem key={user.userId} value={user.name}>
                              {user.name}
                            </MenuItem>
                          ) : null
                        )}
                      </Select>
                    </>
                  )}

                  {state.isSell && (
                    <div className="flex flex-col md:flex-row gap-3 mb-5">
                      <TextField
                        type="number"
                        label="Set a Price"
                        value={state.amount}
                        inputProps={{ min: 1 }}
                        onChange={(e) => updateField("amount", e.target.value)}
                        fullWidth
                        size="small"
                        className="bg-white text-black dark:bg-[#15191E] dark:text-white rounded-md"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">🪙</InputAdornment>
                          ),
                          classes: {
                            input: "text-black dark:text-white", // ✅ Tailwind text color for input
                          },
                        }}
                        InputLabelProps={{
                          className: "text-gray-700 dark:text-gray-300", // ✅ Tailwind text color for label
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                              borderColor: "green",
                            },
                            "&:hover fieldset": {
                              borderColor: "blue",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "purple",
                            },
                          },
                        }}
                      />
                      <Select
                        value={state.token}
                        onChange={(e) => updateField("token", e.target.value)}
                        fullWidth
                        size="small"
                        className="bg-white dark:bg-gray-800 dark:text-white rounded"
                        sx={{
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "gray", // default border
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "blue", // hover border
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "green", // focused border
                          },
                          "& .MuiInputBase-input": {
                            color: "black dark:white", // 👈 text color
                          },
                        }}
                      >
                        {uniqueCurrencies.map((trustLine) => (
                          <MenuItem
                            key={trustLine.currency}
                            value={trustLine.decodedCurrency}
                          >
                            {trustLine.decodedCurrency}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>
                  )}
                  {state.isSell ? (
                    <Typography
                      variant="subtitle2"
                      className="text-center font-semibold text-black dark:text-white"
                    >
                      Total : {state.amount} {state.token}
                    </Typography>
                  ) : (
                    ""
                  )}

                  <div className="text-center">
                    <Button
                      variant="contained"
                      size="large"
                      className="rounded-md w-1/2"
                      onClick={() =>
                        makeOffer(state.isSell, selectedNftForOffer)
                      }
                    >
                      {state.isSell
                        ? !(
                            selectedNftForOffer.userName ===
                            wgtParameters.displayName
                          )
                          ? "Offer Buy"
                          : "Offer Sell"
                        : "Transfer"}
                    </Button>
                  </div>
                </Box>
              )}
            </div>
          </Modal>
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
      )}
    </>
  );
};

export default ParticipantCard;
