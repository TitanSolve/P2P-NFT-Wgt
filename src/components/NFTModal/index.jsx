import React, { useState, useEffect } from "react";
import { Modal, Box, Button, TextField, MenuItem, FormControl, InputLabel, Select, Switch, FormControlLabel, InputAdornment, } from "@mui/material";
import { User, Package, Tag, X, Send, Gavel, Gift } from "lucide-react";
import API_URLS from "../../config";
import TransactionModal from "../TransactionModal";
import NFTMessageBox from "../NFTMessageBox";
import LoadingOverlayForCard from "../LoadingOverlayForCard";
import { useCachedImage } from "../../hooks/useCachedImage";
import nft_pic from "../../assets/nft.png";

const NFTModal = ({
  isOpen,
  onClose,
  nft,
  isOwner,
  membersList,
  wgtParameters,
  myWalletAddress,
  onAction,
  widgetApi
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('XRP');
  const [selectedUser, setSelectedUser] = useState('all');
  const [isListing, setIsListing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Transaction modal states
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [websocketUrl, setWebsocketUrl] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);

  // Message states
  const [isMessageBoxVisible, setIsMessageBoxVisible] = useState(false);
  const [messageBoxType, setMessageBoxType] = useState("success");
  const [messageBoxText, setMessageBoxText] = useState("");

  // Available currencies (you might want to get this from user's trust lines)
  const availableCurrencies = ['XRP'];

  // Use cached image for NFT
  const { src: cachedImageSrc, isLoaded } = useCachedImage(
    nft?.imageURI || nft?.metadata?.image,
    nft_pic,
    { eager: true }
  );

  useEffect(() => {
    if (websocketUrl) {
      const ws = new WebSocket(websocketUrl);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.signed) {
          setTransactionStatus("Transaction signed");
          setIsQrModalVisible(false);
          setMessageBoxType("success");
          setMessageBoxText("Transaction completed successfully!");
          setIsMessageBoxVisible(true);
          onAction(); // Refresh data
        } else if (data.rejected) {
          setTransactionStatus("Transaction rejected");
          setMessageBoxType("error");
          setMessageBoxText("Transaction was rejected");
          setIsMessageBoxVisible(true);
        }
      };
      return () => ws.close();
    }
  }, [websocketUrl]);

  const handleTransfer = async () => {
    if (selectedUser === 'all') {
      setMessageBoxType("error");
      setMessageBoxText("Please select a user to transfer the NFT.");
      setIsMessageBoxVisible(true);
      return;
    }

    const destinationAddress = membersList
      .find((u) => u.name === selectedUser)
      ?.userId?.split(":")[0]
      .replace("@", "");

    const payload = {
      nft: nft.nftokenID,
      amount: "0",
      receiver: destinationAddress,
      sender: myWalletAddress,
    };

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URLS.backendUrl}/create-nft-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setIsLoading(false);

      if (data?.result === "NotEnoughCredit") {
        setMessageBoxType("error");
        setMessageBoxText("You don't have enough mCredits to create this transfer.");
        setIsMessageBoxVisible(true);
        return;
      }

      if (data?.refs) {
        setQrCodeUrl(data.refs.qr_png);
        setWebsocketUrl(data.refs.websocket_status);
        setIsQrModalVisible(true);
      }
    } catch (error) {
      setIsLoading(false);
      setMessageBoxType("error");
      setMessageBoxText("Error creating transfer offer. Please try again.");
      setIsMessageBoxVisible(true);
    }
  };

  const handleSellOffer = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessageBoxType("error");
      setMessageBoxText("Please enter a valid amount.");
      setIsMessageBoxVisible(true);
      return;
    }

    const destination = isListing ? "all" : membersList
      .find((u) => u.name === selectedUser)
      ?.userId?.split(":")[0]
      .replace("@", "");

    if (!isListing && selectedUser === 'all') {
      setMessageBoxType("error");
      setMessageBoxText("Please select a user or create a public listing.");
      setIsMessageBoxVisible(true);
      return;
    }

    let offerAmount;
    if (currency === "XRP") {
      offerAmount = amount;
    } else {
      // Handle other currencies if needed
      offerAmount = {
        currency: currency,
        value: amount,
      };
    }

    const payload = {
      nft: nft.nftokenID,
      amount: offerAmount,
      receiver: destination,
      sender: myWalletAddress,
    };

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URLS.backendUrl}/create-nft-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setIsLoading(false);

      if (data?.result === "NotEnoughCredit") {
        setMessageBoxType("error");
        setMessageBoxText("You don't have enough mCredits to create this offer.");
        setIsMessageBoxVisible(true);
        return;
      }

      if (data?.refs) {
        setQrCodeUrl(data.refs.qr_png);
        setWebsocketUrl(data.refs.websocket_status);
        setIsQrModalVisible(true);
      }
    } catch (error) {
      setIsLoading(false);
      setMessageBoxType("error");
      setMessageBoxText("Error creating sell offer. Please try again.");
      setIsMessageBoxVisible(true);
    }
  };

  const handleBuyOffer = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessageBoxType("error");
      setMessageBoxText("Please enter a valid amount.");
      setIsMessageBoxVisible(true);
      return;
    }

    let offerAmount;
    if (currency === "XRP") {
      offerAmount = (parseFloat(amount) * 1 + 0.000012).toFixed(6);
    } else {
      offerAmount = {
        currency: currency,
        value: (parseFloat(amount) * 1).toString(),
      };
    }

    const payload = {
      nft: nft.nftokenID,
      amount: offerAmount,
      account: myWalletAddress,
      owner: nft.owner,
    };

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URLS.backendUrl}/create-nft-buy-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setIsLoading(false);

      if (data?.result === "NotEnoughCredit") {
        setMessageBoxType("error");
        setMessageBoxText("You don't have enough mCredits to create this offer.");
        setIsMessageBoxVisible(true);
        return;
      }

      if (data?.refs) {
        setQrCodeUrl(data.refs.qr_png);
        setWebsocketUrl(data.refs.websocket_status);
        setIsQrModalVisible(true);
      }
    } catch (error) {
      setIsLoading(false);
      setMessageBoxType("error");
      setMessageBoxText("Error creating buy offer. Please try again.");
      setIsMessageBoxVisible(true);
    }
  };

  const resetForm = () => {
    setAmount('');
    setCurrency('XRP');
    setSelectedUser('all');
    setIsListing(false);
    setActiveTab('details');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const descFromMeta = (meta) => {
    if (!meta) return "";
    // Try multiple common keys
    const direct = meta.description || meta.Description || meta.details || meta.summary;
    if (direct) return String(direct);
    // Try attributes array variants
    const attrs = meta.attributes || meta.Attributes || [];
    const found =
      attrs.find(a =>
        String(a?.trait_type || a?.traitType || a?.type || "").toLowerCase() === "description"
      )?.value;
    return found ? String(found) : "";
  };

  const description = descFromMeta(nft.metadata);

  if (!nft) return null;

  return (
    <>
      <Modal
        open={isOpen}
        onClose={handleClose}
        keepMounted
        slotProps={{ backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.6)" } } }}
      >
        {/* Centered container, no custom fixed/z-index to avoid click traps */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(92vw, 48rem)",
            maxHeight: "90vh",
            bgcolor: "background.paper",
            borderRadius: 4,
            boxShadow: 24,
            overflow: "hidden",
          }}
          className="dark:bg-gray-800"
        >
          {/* Header */}
          <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {nft.metadata?.name || "Unnamed NFT"}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                aria-label="Close"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Tabs - keep visible */}
            <div
              role="tablist"
              className="flex gap-2 px-5 pb-2 sticky top-0 bg-transparent"
            >
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`px-3 py-2 text-sm font-medium rounded-md transition
                  ${activeTab === "details"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                aria-selected={activeTab === "details"}
              >
                <Package size={16} className="inline mr-2" />
                Details
              </button>

              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab("transfer")}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition
                      ${activeTab === "transfer"
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                    aria-selected={activeTab === "transfer"}
                  >
                    <Gift size={16} className="inline mr-2" />
                    Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("sell")}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition
                      ${activeTab === "sell"
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                    aria-selected={activeTab === "sell"}
                  >
                    <Tag size={16} className="inline mr-2" />
                    Sell
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("buy")}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition
                    ${activeTab === "buy"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                  aria-selected={activeTab === "buy"}
                >
                  <Gavel size={16} className="inline mr-2" />
                  Make Offer
                </button>
              )}
            </div>

            {/* Slim progress bar when loading */}
            {isLoading && (
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-transparent">
                <div className="h-full w-1/3 bg-blue-500 animate-pulse rounded-r" />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="grid lg:grid-cols-2 gap-0 max-h-[calc(90vh-130px)] overflow-hidden">
            {/* Image */}
            <div className="p-5 overflow-y-auto">
              <div className="relative bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                <img
                  src={cachedImageSrc}
                  alt={nft.metadata?.name || "NFT"}
                  className={`w-full h-72 lg:h-80 object-cover transition-opacity duration-500 ${
                    isLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  draggable={false}
                />
                <div className="absolute top-3 right-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold text-gray-900 dark:text-white shadow">
                  {nft.ownerName}
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="flex flex-col">
              <div className="flex-1 p-5 overflow-y-auto">
                {/* DETAILS TAB */}
                {activeTab === "details" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      NFT Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Collection</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {nft.collectionName || "Unknown Collection"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Owner</span>
                        <span className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                          <User size={14} />
                          {nft.ownerName}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-600 dark:text-gray-400 mt-0.5">Token ID</span>
                        <span className="text-gray-900 dark:text-white font-mono text-xs break-all">
                          {nft.nftokenID}
                        </span>
                      </div>

                      {/* Always show Description with fallback */}
                      <div className="pt-2">
                        <span className="text-gray-600 dark:text-gray-400 block mb-1">
                          Description
                        </span>
                        <p className="text-gray-900 dark:text-gray-100 text-sm whitespace-pre-wrap break-words leading-6">
                          {description || "No description provided."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TRANSFER TAB */}
                {activeTab === "transfer" && isOwner && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transfer NFT</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Send this NFT to another member for free.
                    </p>

                    <FormControl fullWidth>
                      <InputLabel id="recipient-label">Select Recipient</InputLabel>
                      <Select
                        labelId="recipient-label"
                        id="recipient"
                        value={selectedUser}
                        label="Select Recipient"
                        onChange={(e) => setSelectedUser(e.target.value)}
                      >
                        <MenuItem value="all" disabled>Choose a member…</MenuItem>
                        {membersList
                          .filter(m => m.name !== wgtParameters.displayName)
                          .map(m => (
                            <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
                          ))}
                      </Select>
                    </FormControl>

                    <Button
                      type="button"
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<Send size={16} />}
                      onClick={handleTransfer}
                      disabled={selectedUser === "all"}
                    >
                      Transfer NFT
                    </Button>
                  </div>
                )}

                {/* SELL TAB */}
                {activeTab === "sell" && isOwner && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">List for Sale</h3>

                    <FormControlLabel
                      control={<Switch checked={isListing} onChange={(e) => setIsListing(e.target.checked)} />}
                      label="Public listing (available to anyone)"
                    />

                    {!isListing && (
                      <FormControl fullWidth>
                        <InputLabel id="buyer-label">Select Buyer</InputLabel>
                        <Select
                          labelId="buyer-label"
                          id="buyer"
                          value={selectedUser}
                          label="Select Buyer"
                          onChange={(e) => setSelectedUser(e.target.value)}
                        >
                          <MenuItem value="all" disabled>Choose a member…</MenuItem>
                          {membersList
                            .filter(m => m.name !== wgtParameters.displayName)
                            .map(m => (
                              <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    )}

                    <TextField
                      fullWidth
                      label="Price"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter price"
                      inputProps={{ min: 0, step: "any" }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">{currency}</InputAdornment>,
                      }}
                    />

                    <Button
                      type="button"
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<Tag size={16} />}
                      onClick={handleSellOffer}
                      // Enabled if (amount > 0) AND (public listing OR a buyer is chosen)
                      disabled={!(Number(amount) > 0) || (!isListing && selectedUser === "all")}
                    >
                      Create Sell Offer
                    </Button>
                  </div>
                )}

                {/* BUY TAB */}
                {activeTab === "buy" && !isOwner && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Make an Offer</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Submit a purchase offer to the owner.
                    </p>

                    <TextField
                      fullWidth
                      label="Offer Amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter your offer"
                      inputProps={{ min: 0, step: "any" }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">{currency}</InputAdornment>,
                      }}
                    />

                    <Button
                      type="button"
                      fullWidth
                      variant="contained"
                      color="error"
                      startIcon={<Gavel size={16} />}
                      onClick={handleBuyOffer}
                      disabled={!(Number(amount) > 0)}
                    >
                      Make Offer
                    </Button>
                  </div>
                )}
              </div>

              {/* Footer actions (always visible) */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-end gap-2 bg-white/70 dark:bg-gray-900/60 backdrop-blur">
                <Button
                  variant="outlined"
                  onClick={handleClose}
                  className="dark:text-gray-200"
                >
                  Close
                </Button>
                {/* Contextual primary action preview */}
                {activeTab === "buy" && !isOwner && (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleBuyOffer}
                    disabled={!(Number(amount) > 0)}
                  >
                    Make Offer
                  </Button>
                )}
                {activeTab === "sell" && isOwner && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSellOffer}
                    disabled={!(Number(amount) > 0) || (!isListing && selectedUser === "all")}
                  >
                    Create Sell Offer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Box>
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
    </>
  );
};

export default NFTModal;
