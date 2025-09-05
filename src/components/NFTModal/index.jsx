import React, { useState, useEffect, useMemo, useRef } from "react";
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

// Reusable dark-mode styles for MUI outlined inputs (Select/TextField)
const darkFieldSx = {
  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.82)" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#fff" },
  "& .MuiOutlinedInput-input": { color: "#fff" },
  "& .MuiSvgIcon-root": { color: "#fff" }, // dropdown arrow
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.55)" },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#60A5FA", // tailwind blue-400
  },
};

const darkMenuProps = {
  PaperProps: {
    sx: {
      bgcolor: "#111827", // gray-900
      color: "#fff",
      "& .MuiMenuItem-root.Mui-selected": { bgcolor: "#1F2937" }, // gray-800
      "& .MuiMenuItem-root:hover": { bgcolor: "#1F2937" },
      "& .MuiDivider-root": { bgcolor: "rgba(255,255,255,0.12)" },
    },
  },
};


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
  const [createdOfferType, setCreatedOfferType] = useState("create_buy_offer");
  // Messages
  const [isMessageBoxVisible, setIsMessageBoxVisible] = useState(false);
  const [messageBoxType, setMessageBoxType] = useState("success");
  const [messageBoxText, setMessageBoxText] = useState("");

  const wsRef = useRef(null);

  const safeParse = (v) => {
    try { return JSON.parse(v); } catch { return v; }
  };

  const closeQrModal = (statusText, toastText, toastType = "error") => {
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


  const availableCurrencies = ["XRP"]; // extend if needed

  const { src: cachedImageSrc, isLoaded } = useCachedImage(
    nft?.imageURI || nft?.metadata?.image,
    nft_pic,
    { eager: true }
  );

  const description = useMemo(() => descFromMeta(nft?.metadata), [nft]);

  useEffect(() => {
    if (!websocketUrl) return;

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

      // Xaman/Xumm resolved payload:
      // { signed: true|false, reason?: 'DECLINED'|'EXPIRED'..., ... }
      if (msg?.signed === true) {
        closeQrModal("Transaction signed", "Transaction completed successfully!", "success");
        const requestBody = {
          account: myWalletAddress,
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
        onAction?.(); // refresh data if provided
        return;
      }
      if (msg?.signed === false) {
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
      closeQrModal("Connection error", /*"Wallet connection error. Please try again."*/ "");
    };

    ws.onclose = () => {
      // If the QR modal is still open with no resolution, close gracefully
      if (isQrModalVisible) {
        closeQrModal("Connection closed", /*"Wallet connection closed."*/ "");
      }
    };

    return () => {
      try { ws.close(); } catch { }
      wsRef.current = null;
    };
  }, [websocketUrl, isQrModalVisible, onAction]);


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
      setCreatedOfferType("create_transfer_offer");
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
        ? (parseFloat(amount) + 0.000012).toFixed(6)
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
      setCreatedOfferType("create_sell_offer");
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
    setCreatedOfferType("create_buy_offer");

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
    console.log("NFT data:", nft);
    console.log("Buy offer payload:", payload);

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
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${activeTab === "details"
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
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${activeTab === "transfer"
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
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${activeTab === "sell"
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
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${activeTab === "buy"
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
                  src={cachedImageSrc || nft_pic}
                  alt={nft.metadata?.name || "NFT"}
                  className={`w-full h-72 lg:h-80 object-cover transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"
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

                    <FormControl fullWidth sx={darkFieldSx}>
                      <InputLabel id="recipient-label">Select Recipient</InputLabel>
                      <Select
                        labelId="recipient-label"
                        id="recipient"
                        value={selectedUser}
                        label="Select Recipient"
                        onChange={(e) => setSelectedUser(e.target.value)}
                        MenuProps={darkMenuProps}
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
                        <Switch
                          checked={isListing}
                          onChange={(e) => setIsListing(e.target.checked)}
                          sx={{
                            // thumb
                            "& .MuiSwitch-switchBase.Mui-checked": { color: "#60A5FA" },           // blue-400
                            "& .MuiSwitch-switchBase": { color: "rgba(255,255,255,0.75)" },
                            // track
                            "& .MuiSwitch-track": { backgroundColor: "rgba(255,255,255,0.25)" },
                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                              backgroundColor: "#2563EB", // blue-600
                            },
                          }}
                        />
                      }
                      label="Public listing (available to anyone)"
                      sx={{
                        color: "#fff",
                        "& .MuiFormControlLabel-label": { color: "#fff" },
                      }}
                    />


                    {!isListing && (
                      <FormControl fullWidth sx={darkFieldSx}>
                        <InputLabel id="buyer-label">Select Buyer</InputLabel>
                        <Select
                          labelId="buyer-label"
                          id="buyer"
                          value={selectedUser}
                          label="Select Buyer"
                          onChange={(e) => setSelectedUser(e.target.value)}
                          MenuProps={darkMenuProps}
                        >
                          <MenuItem value="all" disabled>Choose a member…</MenuItem>
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
                      error={amount !== "" && !(parseFloat(amount) > 0)}
                      helperText={amount !== "" && !(parseFloat(amount) > 0) ? "Enter a positive number." : " "}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <span style={{ color: "#fff" }}>{currency}</span>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        ...darkFieldSx,
                        "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.7)" },
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
                      error={amount !== "" && !(parseFloat(amount) > 0)}
                      helperText={amount !== "" && !(parseFloat(amount) > 0) ? "Enter a positive number." : " "}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <span style={{ color: "#fff" }}>{currency}</span>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        ...darkFieldSx,
                        "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.7)" },
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
        onClose={() => closeQrModal("Cancelled", "Transaction flow cancelled.", "info")}
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
