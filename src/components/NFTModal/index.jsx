import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Box,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  InputAdornment,
  Tooltip,
  IconButton,
} from "@mui/material";
import { User, Package, Tag, X, Send, Gavel, Gift, Copy } from "lucide-react";
import API_URLS from "../../config";
import TransactionModal from "../TransactionModal";
import NFTMessageBox from "../NFTMessageBox";
import LoadingOverlayForCard from "../LoadingOverlayForCard";
import { useCachedImage } from "../../hooks/useCachedImage";
import nft_pic from "../../assets/nft.png";

const isPositive = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0;
};

const descFromMeta = (meta) => {
  if (!meta) return "";
  const direct = meta.description || meta.Description || meta.details || meta.summary;
  if (direct) return String(direct);
  const attrs = meta.attributes || meta.Attributes || [];
  const found =
    attrs.find((a) =>
      String(a?.trait_type || a?.traitType || a?.type || "").toLowerCase() === "description"
    )?.value;
  return found ? String(found) : "";
};

const NFTModal = ({
  isOpen,
  onClose,
  nft,
  isOwner,
  membersList,
  wgtParameters,
  myWalletAddress,
  onAction,
  widgetApi,
}) => {
  const [activeTab, setActiveTab] = useState("details");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("XRP");
  const [selectedUser, setSelectedUser] = useState("all");
  const [isListing, setIsListing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // QR / Transaction
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [websocketUrl, setWebsocketUrl] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);

  // Messages
  const [isMessageBoxVisible, setIsMessageBoxVisible] = useState(false);
  const [messageBoxType, setMessageBoxType] = useState("success");
  const [messageBoxText, setMessageBoxText] = useState("");

  const availableCurrencies = ["XRP"]; // extend if needed

  const { src: cachedImageSrc, isLoaded } = useCachedImage(
    nft?.imageURI || nft?.metadata?.image,
    nft_pic,
    { eager: true }
  );

  const description = useMemo(() => descFromMeta(nft?.metadata), [nft]);

  useEffect(() => {
    if (!websocketUrl) return;
    const ws = new WebSocket(websocketUrl);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data || "{}");
      if (data.signed) {
        setTransactionStatus("Transaction signed");
        setIsQrModalVisible(false);
        setMessageBoxType("success");
        setMessageBoxText("Transaction completed successfully!");
        setIsMessageBoxVisible(true);
        onAction?.();
      } else if (data.rejected) {
        setTransactionStatus("Transaction rejected");
        setMessageBoxType("error");
        setMessageBoxText("Transaction was rejected.");
        setIsMessageBoxVisible(true);
      }
    };
    return () => ws.close();
  }, [websocketUrl, onAction]);

  const getMxidLocalPart = (mxid) =>
    mxid?.includes(":") ? mxid.split(":")[0]?.replace("@", "") : undefined;

  const handleTransfer = async () => {
    if (selectedUser === "all") {
      setMessageBoxType("error");
      setMessageBoxText("Please select a user to transfer the NFT.");
      setIsMessageBoxVisible(true);
      return;
    }
    const destinationAddress = getMxidLocalPart(
      membersList.find((u) => u.name === selectedUser)?.userId
    );

    const payload = {
      nft: nft.nftokenID,
      amount: "0",
      receiver: destinationAddress,
      sender: myWalletAddress,
    };

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URLS.backendUrl}/create-nft-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
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
    } catch {
      setIsLoading(false);
      setMessageBoxType("error");
      setMessageBoxText("Error creating transfer offer. Please try again.");
      setIsMessageBoxVisible(true);
    }
  };

  const handleSellOffer = async () => {
    if (!isPositive(amount)) {
      setMessageBoxType("error");
      setMessageBoxText("Please enter a valid positive amount.");
      setIsMessageBoxVisible(true);
      return;
    }
    if (!isListing && selectedUser === "all") {
      setMessageBoxType("error");
      setMessageBoxText("Please select a buyer or enable public listing.");
      setIsMessageBoxVisible(true);
      return;
    }

    const destination = isListing
      ? "all"
      : getMxidLocalPart(membersList.find((u) => u.name === selectedUser)?.userId);

    const offerAmount =
      currency === "XRP"
        ? amount
        : {
            currency,
            value: String(parseFloat(amount)),
          };

    const payload = {
      nft: nft.nftokenID,
      amount: offerAmount,
      receiver: destination,
      sender: myWalletAddress,
    };

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URLS.backendUrl}/create-nft-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
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
    } catch {
      setIsLoading(false);
      setMessageBoxType("error");
      setMessageBoxText("Error creating sell offer. Please try again.");
      setIsMessageBoxVisible(true);
    }
  };

  const handleBuyOffer = async () => {
    if (!isPositive(amount)) {
      setMessageBoxType("error");
      setMessageBoxText("Please enter a valid positive amount.");
      setIsMessageBoxVisible(true);
      return;
    }

    const offerAmount =
      currency === "XRP"
        ? (parseFloat(amount) + 0.000012).toFixed(6)
        : { currency, value: String(parseFloat(amount)) };

    const payload = {
      nft: nft.nftokenID,
      amount: offerAmount,
      account: myWalletAddress,
      owner: nft.owner,
    };

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URLS.backendUrl}/create-nft-buy-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
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
    } catch {
      setIsLoading(false);
      setMessageBoxType("error");
      setMessageBoxText("Error creating buy offer. Please try again.");
      setIsMessageBoxVisible(true);
    }
  };

  const resetForm = () => {
    setAmount("");
    setCurrency("XRP");
    setSelectedUser("all");
    setIsListing(false);
    setActiveTab("details");
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  if (!nft) return null;

  const canSubmitSell = isPositive(amount) && (isListing || selectedUser !== "all");
  const canSubmitBuy = isPositive(amount);

  return (
    <>
      <Modal
        open={isOpen}
        onClose={handleClose}
        keepMounted
        slotProps={{ backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.55)" } } }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "100vw", sm: "min(92vw, 48rem)" },
            height: { xs: "92vh", sm: "auto" },
            maxHeight: "92vh",
            bgcolor: "background.paper",
            borderRadius: { xs: 0, sm: 4 },
            boxShadow: 24,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
          className="dark:bg-gray-900"
        >
          {/* Header */}
          <div className="relative border-b border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-850">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-gray-900 dark:text-white">
                  {nft.metadata?.name || "Unnamed NFT"}
                </h2>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {nft.collectionName || "Unknown Collection"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-label="Close"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Segmented tabs */}
            <div className="px-5 pb-3">
              <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    activeTab === "details"
                      ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-200 shadow-sm"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  aria-pressed={activeTab === "details"}
                >
                  <Package size={16} className="inline mr-2" />
                  Details
                </button>

                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab("transfer")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                        activeTab === "transfer"
                          ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-200 shadow-sm"
                          : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      }`}
                      aria-pressed={activeTab === "transfer"}
                    >
                      <Gift size={16} className="inline mr-2" />
                      Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("sell")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                        activeTab === "sell"
                          ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-200 shadow-sm"
                          : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      }`}
                      aria-pressed={activeTab === "sell"}
                    >
                      <Tag size={16} className="inline mr-2" />
                      Sell
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab("buy")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                      activeTab === "buy"
                        ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-200 shadow-sm"
                        : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                    aria-pressed={activeTab === "buy"}
                  >
                    <Gavel size={16} className="inline mr-2" />
                    Make Offer
                  </button>
                )}
              </div>
            </div>

            {isLoading && (
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-transparent">
                <div className="h-full w-1/3 bg-blue-500 animate-pulse rounded-r" />
              </div>
            )}
          </div>

          {/* BODY */}
          <div className="grid lg:grid-cols-2 gap-0 min-h-0 flex-1">
            {/* Image */}
            <div className="p-5 overflow-y-auto">
              <div className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-800">
                <img
                  src={cachedImageSrc}
                  alt={nft.metadata?.name || "NFT"}
                  className={`w-full h-72 lg:h-80 object-cover transition-opacity duration-500 ${
                    isLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  draggable={false}
                />
                <div className="absolute top-3 right-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold text-gray-900 dark:text-white shadow">
                  {nft.ownerName}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col min-h-0">
              <div className="flex-1 p-5 overflow-y-auto space-y-5">
                {/* DETAILS — responsive definition grid */}
                {activeTab === "details" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      NFT Information
                    </h3>

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Collection */}
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                        <dt className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Collection
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                          {nft.collectionName || "Unknown Collection"}
                        </dd>
                      </div>

                      {/* Owner */}
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                        <dt className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Owner
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <User size={14} />
                          {nft.ownerName}
                        </dd>
                      </div>

                      {/* Token ID — centered and tidy, spans full width on sm+ */}
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 sm:col-span-2">
                        <dt className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 text-center">
                          Token ID
                        </dt>
                        <dd className="mt-1 flex flex-wrap items-center justify-center gap-2">
                          <code className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all text-center">
                            {nft.nftokenID}
                          </code>
                          <Tooltip title="Copy Token ID">
                            <IconButton
                              size="small"
                              onClick={() => navigator.clipboard.writeText(nft.nftokenID || "")}
                            >
                              <Copy size={14} />
                            </IconButton>
                          </Tooltip>
                        </dd>
                      </div>

                      {/* Description — spans full width, responsive text */}
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 sm:col-span-2">
                        <dt className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Description
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words leading-6">
                          {description || "No description provided."}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* TRANSFER */}
                {activeTab === "transfer" && isOwner && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Transfer NFT
                    </h3>
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
                        <MenuItem value="all" disabled>
                          Choose a member…
                        </MenuItem>
                        {membersList
                          .filter((m) => m.name !== wgtParameters.displayName)
                          .map((m) => (
                            <MenuItem key={m.name} value={m.name}>
                              {m.name}
                            </MenuItem>
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
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                    >
                      Transfer NFT
                    </Button>
                  </div>
                )}

                {/* SELL */}
                {activeTab === "sell" && isOwner && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      List for Sale
                    </h3>

                    <FormControlLabel
                      control={
                        <Switch checked={isListing} onChange={(e) => setIsListing(e.target.checked)} />
                      }
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
                          <MenuItem value="all" disabled>
                            Choose a member…
                          </MenuItem>
                          {membersList
                            .filter((m) => m.name !== wgtParameters.displayName)
                            .map((m) => (
                              <MenuItem key={m.name} value={m.name}>
                                {m.name}
                              </MenuItem>
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
                      onKeyDown={(e) => e.key === "Enter" && canSubmitSell && handleSellOffer()}
                      placeholder="Enter price"
                      inputProps={{ min: 0, step: "any", inputMode: "decimal" }}
                      error={amount !== "" && !isPositive(amount)}
                      helperText={
                        amount !== "" && !isPositive(amount) ? "Enter a positive number." : " "
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">{currency}</InputAdornment>
                        ),
                      }}
                    />

                    <Button
                      type="button"
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<Tag size={16} />}
                      onClick={handleSellOffer}
                      disabled={!canSubmitSell}
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                    >
                      Create Sell Offer
                    </Button>
                  </div>
                )}

                {/* BUY */}
                {activeTab === "buy" && !isOwner && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Make an Offer
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Submit a purchase offer to the owner.
                    </p>

                    <TextField
                      fullWidth
                      label="Offer Amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && canSubmitBuy && handleBuyOffer()}
                      placeholder="Enter your offer"
                      inputProps={{ min: 0, step: "any", inputMode: "decimal" }}
                      error={amount !== "" && !isPositive(amount)}
                      helperText={
                        amount !== "" && !isPositive(amount) ? "Enter a positive number." : " "
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">{currency}</InputAdornment>
                        ),
                      }}
                    />

                    <Button
                      type="button"
                      fullWidth
                      variant="contained"
                      color="error"
                      startIcon={<Gavel size={16} />}
                      onClick={handleBuyOffer}
                      disabled={!canSubmitBuy}
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                    >
                      Make Offer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Non-blocking overlay */}
          {isLoading && (
            <div className="pointer-events-none absolute inset-0 z-20">
              <LoadingOverlayForCard />
            </div>
          )}
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
