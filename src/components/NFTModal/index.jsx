import React, { useState, useEffect } from "react";
import { Modal, Box, Button, TextField, MenuItem, FormControl, InputLabel, Select, Switch, FormControlLabel } from "@mui/material";
import { User, Package, Tag, ExternalLink, X, Send, ShoppingCart, Gavel, Gift } from "lucide-react";
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

  if (!nft) return null;

  return (
    <>
      <Modal open={isOpen} onClose={handleClose}>
        <Box className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {isLoading && <LoadingOverlayForCard />}
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {nft.metadata?.name || 'Unnamed NFT'}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col lg:flex-row max-h-[calc(90vh-120px)] overflow-hidden">
              {/* Left side - Image */}
              <div className="lg:w-1/2 p-6">
                <div className="relative bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
                  <img
                    src={cachedImageSrc}
                    alt={nft.metadata?.name || 'NFT'}
                    className={`w-full h-64 lg:h-80 object-cover transition-opacity duration-500 ${
                      isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  {/* Owner badge */}
                  <div className="absolute top-3 right-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-gray-900 dark:text-white shadow-lg">
                    {nft.ownerName}
                  </div>
                </div>
              </div>

              {/* Right side - Details and Actions */}
              <div className="lg:w-1/2 flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'details'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <Package size={16} className="inline mr-2" />
                    Details
                  </button>
                  {isOwner ? (
                    <>
                      <button
                        onClick={() => setActiveTab('transfer')}
                        className={`px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === 'transfer'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                      >
                        <Gift size={16} className="inline mr-2" />
                        Transfer
                      </button>
                      <button
                        onClick={() => setActiveTab('sell')}
                        className={`px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === 'sell'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                      >
                        <Tag size={16} className="inline mr-2" />
                        Sell
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setActiveTab('buy')}
                      className={`px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'buy'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                    >
                      <Gavel size={16} className="inline mr-2" />
                      Make Offer
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {activeTab === 'details' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          NFT Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Collection:</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {nft.collectionName || 'Unknown Collection'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Owner:</span>
                            <span className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                              <User size={14} />
                              {nft.ownerName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Token ID:</span>
                            <span className="text-gray-900 dark:text-white font-mono text-xs break-all">
                              {nft.nftokenID}
                            </span>
                          </div>
                          {nft.metadata?.description && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400 block mb-1">Description:</span>
                              <p className="text-gray-900 dark:text-white text-sm">
                                {nft.metadata.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'transfer' && isOwner && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Transfer NFT
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Send this NFT to another member for free.
                      </p>
                      
                      <FormControl fullWidth>
                        <InputLabel>Select Recipient</InputLabel>
                        <Select
                          value={selectedUser}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          label="Select Recipient"
                        >
                          <MenuItem value="all" disabled>
                            Choose a member...
                          </MenuItem>
                          {membersList
                            .filter(member => member.name !== wgtParameters.displayName)
                            .map((member) => (
                              <MenuItem key={member.name} value={member.name}>
                                {member.name}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>

                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<Send size={16} />}
                        onClick={handleTransfer}
                        disabled={selectedUser === 'all'}
                        sx={{
                          backgroundColor: '#059669',
                          '&:hover': { backgroundColor: '#047857' },
                          '&:disabled': { backgroundColor: '#9CA3AF' }
                        }}
                      >
                        Transfer NFT
                      </Button>
                    </div>
                  )}

                  {activeTab === 'sell' && isOwner && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Sell NFT
                      </h3>
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={isListing}
                            onChange={(e) => setIsListing(e.target.checked)}
                          />
                        }
                        label="Create public listing (available to anyone)"
                      />

                      {!isListing && (
                        <FormControl fullWidth>
                          <InputLabel>Select Buyer</InputLabel>
                          <Select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            label="Select Buyer"
                          >
                            <MenuItem value="all" disabled>
                              Choose a member...
                            </MenuItem>
                            {membersList
                              .filter(member => member.name !== wgtParameters.displayName)
                              .map((member) => (
                                <MenuItem key={member.name} value={member.name}>
                                  {member.name}
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
                        placeholder="Enter price"
                        InputProps={{
                          endAdornment: currency
                        }}
                      />

                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<Tag size={16} />}
                        onClick={handleSellOffer}
                        disabled={!amount || (!isListing && selectedUser === 'all')}
                        sx={{
                          backgroundColor: '#2563EB',
                          '&:hover': { backgroundColor: '#1D4ED8' },
                          '&:disabled': { backgroundColor: '#9CA3AF' }
                        }}
                      >
                        Create Sell Offer
                      </Button>
                    </div>
                  )}

                  {activeTab === 'buy' && !isOwner && (
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
                        placeholder="Enter your offer"
                        InputProps={{
                          endAdornment: currency
                        }}
                      />

                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<Gavel size={16} />}
                        onClick={handleBuyOffer}
                        disabled={!amount}
                        sx={{
                          backgroundColor: '#DC2626',
                          '&:hover': { backgroundColor: '#B91C1C' },
                          '&:disabled': { backgroundColor: '#9CA3AF' }
                        }}
                      >
                        Make Offer
                      </Button>
                    </div>
                  )}
                </div>
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
