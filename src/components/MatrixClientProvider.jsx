import React, { useEffect, useState } from "react";
import { useWidgetApi } from "@matrix-widget-toolkit/react";
import { Tabs, Tab } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { STATE_EVENT_ROOM_MEMBER } from "@matrix-widget-toolkit/api";
import axios from "axios";
import { Client, NFTokenCreateOfferFlags } from "xrpl";
import NFTs from "../pages/NFTs";
import Offers from "../pages/Offers";
import API_URLS from "../config";
import "./index.css";
import LoadingOverlay from "./LoadingOverlay";
import ImageCacheDebugPanel from "./ImageCacheDebugPanel";
import { Package } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import imageCache from "../services/imageCache";

const getImageData = async (nft) => {
  let URI = "";
  let name = nft.name;

  try {
    const metadataUrl = `${API_URLS.marketPlace}/api/metadata/${nft?.NFTokenID}?assets=true`;
    const response = await axios.get(metadataUrl);
    URI = response.data.image; // Bithomp now provides direct image URLs with assets=true
    name = response.data.name;
  } catch (error) {
    console.log("Error fetching metadata:", error);
  }
  return { name: name, URI: URI };
};

const MatrixClientProvider = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const widgetApi = useWidgetApi();
  const [myNftData, setMyNftData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersList, setMembersList] = useState([]);
  const { theme, toggleTheme } = useTheme();
  const [myOwnWalletAddress, setMyWalletAddress] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(0);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [cancelledOffer, setCancelledOffer] = useState(null);
  const [subscribedUsers, setSubscribedUsers] = useState([]);
  const [client, setClient] = useState(null);
  const [loadedCollections, setLoadedCollections] = useState({}); // Cache for loaded NFTs by collection
  const [loadingCollections, setLoadingCollections] = useState({}); // Track loading state per collection
  const [showCacheDebug, setShowCacheDebug] = useState(false); // Debug panel toggle

  // Function to load collections metadata only (without individual NFTs)
  // Function to load collections metadata AND the user's NFTs grouped by collection
  const loadUserCollections = async (walletAddress) => {
    try {
      const url = `${API_URLS.marketPlace}/api/v2/nfts?owner=${walletAddress}&limit=400&assets=true&collectionDetails=true`;
      const response = await fetch(url, {
        method: "GET",
        headers: { "x-bithomp-token": API_URLS.bithompToken },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch collections for ${walletAddress}: ${response.status}`);
        return { collections: [], nftsByKey: {} };
      }

      const data = await response.json();
      const allNfts = Array.isArray(data.nfts) ? data.nfts : [];
      if (allNfts.length === 0) {
        return { collections: [], nftsByKey: {} };
      }

      // Build a lookup of NFTs per collectionKey = `${issuer}-${nftokenTaxon}`
      const nftsByKey = allNfts.reduce((acc, nft) => {
        const key = `${nft.issuer}-${nft.nftokenTaxon}`;
        const imageURI = nft.assets?.image || nft.metadata?.image || nft.imageURI || "";

        if (!acc[key]) acc[key] = [];
        acc[key].push({
          ...nft,
          imageURI,
          collectionName: nft.metadata?.collection?.name || nft.collection || `Collection ${nft.nftokenTaxon}`,
        });
        return acc;
      }, {});

      // Build collection summaries from the grouped NFTs
      const collections = Object.entries(nftsByKey).map(([collectionKey, list]) => {
        const sample = list.find(n => n.imageURI) || list[0];
        const name =
          sample?.metadata?.collection?.name ||
          sample?.metadata?.name ||
          sample?.collectionName ||
          `Collection ${sample?.nftokenTaxon ?? "Unknown"}`;
        const sampleImage = sample?.assets?.image || sample?.metadata?.image || sample?.imageURI || null;

        return {
          name,
          issuer: sample.issuer,
          nftokenTaxon: sample.nftokenTaxon,
          collectionKey,
          nftCount: list.length,
          sampleNft: sample,
          sampleImage,
        };
      });

      return { collections, nftsByKey };
    } catch (error) {
      console.error(`❌ Error fetching collections for ${walletAddress}:`, error.message);
      return { collections: [], nftsByKey: {} };
    }
  };


  // Function to load NFTs for a specific collection on demand
  const loadCollectionNFTs = async (walletAddress, collectionName, userName, userId, issuer = null, nftokenTaxon = null) => {
    const cacheKey = issuer && nftokenTaxon ? `${walletAddress}-${issuer}-${nftokenTaxon}` : `${walletAddress}-${collectionName}`;

    // Return cached data if available
    if (loadedCollections[cacheKey]) {
      return loadedCollections[cacheKey];
    }

    // Prevent multiple simultaneous requests for the same collection
    if (loadingCollections[cacheKey]) {
      return null;
    }

    setLoadingCollections(prev => ({ ...prev, [cacheKey]: true }));

    try {
      // First, fetch all NFTs for the wallet
      const response = await fetch(
        `${API_URLS.marketPlace}/api/v2/nfts?owner=${walletAddress}&limit=400&assets=true`,
        {
          method: "GET",
          headers: {
            "x-bithomp-token": API_URLS.bithompToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch NFT data");
      }

      const data = await response.json();
      const allNfts = data.nfts || [];

      // Filter NFTs by issuer and taxon if provided, otherwise by collection name
      let filteredNfts = allNfts;
      if (issuer && nftokenTaxon) {
        filteredNfts = allNfts.filter(nft =>
          nft.issuer === issuer && nft.nftokenTaxon === nftokenTaxon
        );
      } else if (collectionName) {
        filteredNfts = allNfts.filter(nft => {
          const nftCollectionName = nft.metadata?.collection?.name || nft.collection;
          return nftCollectionName === collectionName;
        });
      }

      const enrichedNfts = await Promise.all(
        filteredNfts.map(async (nft) => {
          // Prioritize Bithomp CDN URLs over IPFS URLs for better performance
          const imageURI = nft.assets?.image || nft.metadata?.image || nft.imageURI || "";
          return {
            ...nft,
            imageURI,
            userName,
            userId,
            ownerUsername: nft.ownerDetails?.username || null,
            collectionName: nft.collection || collectionName,
          };
        })
      );

      // Preload images for better UX
      const imageUrls = enrichedNfts
        .map(nft => nft.imageURI)
        .filter(url => url && url.trim() !== '');

      if (imageUrls.length > 0) {
        // console.log(`🖼️ Preloading ${imageUrls.length} NFT images for collection ${collectionName}`);
        imageCache.preloadImages(imageUrls).catch(error => {
          console.warn('Failed to preload some images:', error);
        });
      }

      // Cache the loaded NFTs
      setLoadedCollections(prev => ({ ...prev, [cacheKey]: enrichedNfts }));
      setLoadingCollections(prev => ({ ...prev, [cacheKey]: false }));

      return enrichedNfts;
    } catch (error) {
      console.error(`Error fetching NFTs for collection ${collectionName}:`, error.message);
      setLoadingCollections(prev => ({ ...prev, [cacheKey]: false }));
      return [];
    }
  };

  // useEffect(() => {
  //   return () => {
  //     client.disconnect();
  //   };
  // }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const events = await widgetApi.receiveStateEvents(
          STATE_EVENT_ROOM_MEMBER
        );
        console.log("events : ", events);
        const usersList = events
          .filter((item) => {
            // Only include users with membership state 'join' or having displayname
            return item.content.membership === "join";
          })
          .map((item) => ({
            name: item.content.displayname,
            userId: item.sender,
          }))
          .filter((user) => {
            // Filter out tokengatebot user
            return user.userId !== "@tokengatebot:synapse.textrp.io";
          });

        const userIds = usersList.map((member) =>
          member.userId.split(":")[0].replace("@", "")
        );

        const subscribedUsers_ = userIds.filter(
          (userId) => userId !== myOwnWalletAddress
        );
        setSubscribedUsers(subscribedUsers_);

        console.log("userIds : ", userIds);

        const own = usersList.find(
          (u) => u.name === widgetApi.widgetParameters.displayName
        );
        const ownWalletAddress = own.userId?.split(":")[0].replace("@", "");
        console.log("ownWalletAddress : ", ownWalletAddress);
        setMyWalletAddress(ownWalletAddress);

        const client_ = new Client(API_URLS.xrplMainnetUrl);
        await client_.connect();
        console.log("Connected to XRPL");
        setClient(client_);
        setMembersList(usersList);

        // Load collections for each user instead of all NFTs
        console.log("🚀 Loading collections for all users...");
        const usersWithCollections = await Promise.all(
          usersList.map(async (member) => {
            const walletAddress = member.userId.split(":")[0].replace("@", "");
            const { collections, nftsByKey } = await loadUserCollections(walletAddress);

            const groupedNfts = collections.map((collection) => ({
              collection: collection.name || "Unknown Collection",
              collectionKey: collection.collectionKey,
              issuer: collection.issuer,
              nftokenTaxon: collection.nftokenTaxon,
              // 👇 Set the user's NFTs array here
              nfts: (nftsByKey[collection.collectionKey] || []).map(nft => ({
                ...nft,
                userName: member.name,
                userId: member.userId,
              })),
              nftCount: collection.nftCount || (nftsByKey[collection.collectionKey]?.length || 0),
              collectionInfo: collection,
            }));

            return {
              ...member,
              walletAddress,
              groupedNfts,
            };
          })
        );


        console.log("✅ All users with collections:", usersWithCollections);
        setMyNftData(usersWithCollections);

        // Preload collection sample images for better UX
        const sampleImages = usersWithCollections
          .flatMap(user => user.groupedNfts)
          .map(group => {
            // Try multiple sources for sample images
            let sampleImage = null;

            // First priority: direct sampleImage from collection info
            if (group.collectionInfo?.sampleImage) {
              sampleImage = group.collectionInfo.sampleImage;
            }
            // Second priority: from sample NFT assets (Bithomp CDN)
            else if (group.collectionInfo?.sampleNft?.assets?.image) {
              sampleImage = group.collectionInfo.sampleNft.assets.image;
            }
            // Third priority: from sample NFT metadata (IPFS)
            else if (group.collectionInfo?.sampleNft?.metadata?.image) {
              sampleImage = group.collectionInfo.sampleNft.metadata.image;
            }
            // Fourth priority: from sample NFT imageURI
            else if (group.collectionInfo?.sampleNft?.imageURI) {
              sampleImage = group.collectionInfo.sampleNft.imageURI;
            }

            return sampleImage;
          })
          .filter(url => url && url.trim() !== '' && url !== 'undefined' && url !== 'null');

        if (sampleImages.length > 0) {
          // console.log(`🖼️ Preloading ${sampleImages.length} collection sample images:`, sampleImages);
          imageCache.preloadImages(sampleImages).catch(error => {
            console.warn('Failed to preload collection sample images:', error);
          });
        } else {
          console.log('🤔 No sample images found for collections');
        }

      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [widgetApi]);

  function refreshOffers() {
    console.log("Refresh Offers--->");
    setIsRefreshing(isRefreshing === 0 ? 1 : isRefreshing === 1 ? 2 : 1);
  }

  // Function to handle loading NFTs for a specific collection
  const handleLoadCollectionNFTs = async (walletAddress, collectionName, userName, userId, issuer = null, nftokenTaxon = null) => {
    const nfts = await loadCollectionNFTs(walletAddress, collectionName, userName, userId, issuer, nftokenTaxon);

    if (nfts && nfts.length > 0) {
      // Update the myNftData state to include the loaded NFTs
      setMyNftData(prevData =>
        prevData.map(user => {
          if (user.walletAddress === walletAddress) {
            return {
              ...user,
              groupedNfts: user.groupedNfts.map(group => {
                // Match by collectionKey, issuer+taxon, or collection name
                const isMatch =
                  (issuer && nftokenTaxon && group.issuer === issuer && group.nftokenTaxon === nftokenTaxon) ||
                  group.collection === collectionName;

                if (isMatch) {
                  return {
                    ...group,
                    nfts: nfts,
                  };
                }
                return group;
              }),
            };
          }
          return user;
        })
      );
    }

    return nfts;
  };

  function extractOfferIdFromMeta(meta) {
    if (!meta?.AffectedNodes) return null;

    for (const node of meta.AffectedNodes) {
      if (node.CreatedNode?.LedgerEntryType === "NFTokenOffer") {
        return node.CreatedNode.LedgerIndex;
      }
    }
    return null;
  }

  useEffect(() => {
    if (
      !client ||
      !myNftData.length ||
      !myOwnWalletAddress ||
      !subscribedUsers.length
    )
      return;

    console.log("------------------- client.on-------------------");
    console.log("subscribedUsers : ", subscribedUsers);
    console.log("client->isConnected : ", !client.isConnected());

    const allUserNamesByWalletAddress = membersList.reduce((acc, member) => {
      const wallet = member.userId.split(":")[0].replace("@", "");
      const name = member.name;
      acc[wallet] = name;
      return acc;
    }, {});

    const subscribeToAccount = async () => {
      try {
        console.log("📡 Subscribing to accounts:", subscribedUsers);
        await client.request({
          command: "subscribe",
          accounts: subscribedUsers,
        });
        console.log("✅ Successfully subscribed");
      } catch (err) {
        console.warn("❌ Failed to subscribe:", err.message);
      }
    };

    subscribeToAccount();

    const listener = (tx) => {
      console.log("Transaction detected:", tx);
      const type = tx?.tx_json?.TransactionType;
      const validated = tx?.validated;
      if (validated === true) {
        if (
          (type === "NFTokenCreateOffer" ||
            type === "NFTokenCancelOffer" ||
            type === "NFTokenAcceptOffer") &&
          tx?.meta?.TransactionResult === "tesSUCCESS"
        ) {
          console.log("📦 NFT TX Detected:", tx.tx_json);
          if (type === "NFTokenCreateOffer") {
            const offerId = extractOfferIdFromMeta(tx.meta);
            const isSell =
              (tx?.tx_json?.Flags &
                NFTokenCreateOfferFlags.tfSellNFToken) !==
              0;

            const account = tx?.tx_json?.Account;
            const owner = tx?.tx_json?.Owner;
            const destination = tx?.tx_json?.Destination;
            const amount = tx?.tx_json?.Amount;
            const nftId = tx?.tx_json?.NFTokenID;
            console.log("myNftData : ", myNftData);
            const nft = myNftData
              .flatMap((user) => user.groupedNfts)
              .flatMap((group) => group.nfts)
              .find((nft) => nft.nftokenID === nftId);
            console.log("nft : ", nft);
            console.log(
              "isSell : ",
              isSell,
              "owner : ",
              owner,
              "myOwnWalletAddress : ",
              myOwnWalletAddress
            );

            if (amount === "0") {
              //transfer offer
              console.log(
                "Incoming Transfer Offer detected",
                isSell,
                destination,
                myOwnWalletAddress
              );
              if (isSell && destination === myOwnWalletAddress) {
                //buy, sell offer
                console.log("Incoming Transfer Offer detected");
                const offer = {
                  offer: {
                    offerId: offerId,
                    amount: amount,
                    offerOwner: account,
                    offerOwnerName: allUserNamesByWalletAddress[account],
                    nftId: nft.nftokenID,
                    isSell: isSell,
                    destination: destination,
                  },
                  nft: {
                    ...nft,
                  },
                };

                console.log("Incoming Offer detected:", offer);
                setIncomingOffer(offer);
              }
            } else {
              if (!isSell && owner === myOwnWalletAddress) {
                //buy, sell offer
                console.log("Incoming Buy Offer detected");
                const offer = {
                  offer: {
                    offerId: offerId,
                    amount: amount,
                    offerOwner: account,
                    offerOwnerName: allUserNamesByWalletAddress[account],
                    nftId: nft.nftokenID,
                    isSell: isSell,
                    destination: destination,
                  },
                  nft: {
                    ...nft,
                  },
                };

                console.log("Incoming Offer detected:", offer);
                setIncomingOffer(offer);
              }
            }
          } else if (type === "NFTokenCancelOffer") {
            const offerIds = tx?.tx_json?.NFTokenOffers;
            if (offerIds.length > 0) {
              setCancelledOffer(offerIds);
            }
          } else if (type === "NFTokenAcceptOffer") {
            const sellOfferId = tx?.tx_json?.NFTokenSellOffer;
            const buyOfferId = tx?.tx_json?.NFTokenBuyOffer;

            let buyerWallet = null;
            let sellerWallet = null;
            let nftId = null;

            if (tx?.tx_json?.NFTokenBrokerFee > 15) {
              for (const node of tx.meta.AffectedNodes) {
                if (
                  node.DeletedNode &&
                  node.DeletedNode.LedgerEntryType === "NFTokenOffer" &&
                  node.DeletedNode.FinalFields
                ) {
                  const offer = node.DeletedNode.FinalFields;
                  const isSell = (offer.Flags & 1) === 1;
                  nftId = node?.DeletedNode?.FinalFields?.NFTokenID;

                  if (isSell) {
                    sellerWallet = offer.Owner;
                  } else {
                    buyerWallet = offer.Owner;
                  }
                }
              }
            } else {
              buyerWallet = tx?.tx_json?.Account;
              const affectedNodes = tx?.meta?.AffectedNodes;
              const sellOfferNode = affectedNodes.find(
                (node) =>
                  node.DeletedNode?.LedgerEntryType === "NFTokenOffer" &&
                  node.DeletedNode.FinalFields?.Flags === 1
              );
              sellerWallet = sellOfferNode?.DeletedNode?.FinalFields?.Owner;
              nftId = sellOfferNode?.DeletedNode?.FinalFields?.NFTokenID;
            }
            console.log(
              "deatils of the offer",
              sellOfferId,
              buyOfferId,
              buyerWallet,
              sellerWallet,
              nftId
            );
            setCancelledOffer([sellOfferId, buyOfferId]);

            setMyNftData((prevData) => {
              console.log("✅ Starting update for NFT transfer", {
                nftId,
                sellerWallet,
                buyerWallet,
              });

              // Step 1: Find the NFT to transfer BEFORE modifying anything
              const sellerUser = prevData.find(
                (u) => u.walletAddress === sellerWallet
              );
              const nftToTransfer = sellerUser?.groupedNfts
                .flatMap((group) => group.nfts)
                .find((nft) => nft.nftokenID === nftId);

              if (!nftToTransfer) {
                console.warn("❌ NFT to transfer not found");
                return prevData;
              }

              const userName = allUserNamesByWalletAddress[buyerWallet];
              if (userName !== undefined) {
                nftToTransfer.userName = userName;
                nftToTransfer.userId = buyerWallet;
              } else {
                console.error("Buyer wallet address not found in user names");
              }

              console.log("🔄 NFT to transfer found:", nftToTransfer);

              const updatedData = prevData.map((user) => {
                // Step 2: Remove from seller
                if (user.walletAddress === sellerWallet) {
                  const updatedGroups = user.groupedNfts
                    .map((group) => {
                      const filteredNfts = group.nfts.filter(
                        (nft) => nft.nftokenID !== nftId
                      );
                      if (filteredNfts.length === 0) {
                        console.log(
                          `🧹 Removing empty group from seller ${sellerWallet}`,
                          group.collection
                        );
                        return null;
                      }
                      return { ...group, nfts: filteredNfts };
                    })
                    .filter((group) => group !== null);

                  console.log(
                    `✅ Updated groups for seller ${sellerWallet}:`,
                    updatedGroups
                  );

                  return { ...user, groupedNfts: updatedGroups };
                }

                // Step 3: Add to buyer
                else if (user.walletAddress === buyerWallet) {
                  const existingGroup = user.groupedNfts.find(
                    (group) => group.collection === nftToTransfer.collectionName
                  );

                  let newGroupedNfts;
                  if (existingGroup) {
                    newGroupedNfts = user.groupedNfts.map((group) =>
                      group.collection === nftToTransfer.collectionName
                        ? { ...group, nfts: [...group.nfts, nftToTransfer] }
                        : group
                    );
                    console.log(
                      `➕ Added NFT to existing group for buyer ${buyerWallet}`
                    );
                  } else {
                    newGroupedNfts = [
                      ...user.groupedNfts,
                      {
                        collection: nftToTransfer.collectionName,
                        nfts: [nftToTransfer],
                      },
                    ];
                    console.log(
                      `✨ Created new group and added NFT for buyer ${buyerWallet}`
                    );
                  }

                  return { ...user, groupedNfts: newGroupedNfts };
                }

                // Step 4: Unrelated users remain unchanged
                return user;
              });

              console.log("✅ Final updated NFT ownership data:", updatedData);
              return updatedData;
            });
          }
        }
      }
    };

    client.on("transaction", listener);

    // Clean up: remove listener when state changes or component unmounts
    return () => {
      client.off("transaction", listener);
    };
  }, [client, myNftData, myOwnWalletAddress]); // ✅ dependencies

  const updateUsersNFTs = async (nftId, seller, buyer) => {
    console.log("updateUsersNFTs--->", nftId, seller, buyer);

    const selectedUser = myNftData.find(
      (user) => user.walletAddress === seller
    );

    const selectedCollection = selectedUser?.groupedNfts.find((group) =>
      group.nfts.some((nft) => nft.nftokenID === nftId)
    );

    const selectedNft = selectedCollection?.nfts.find(
      (nft) => nft.nftokenID === nftId
    );

    if (!selectedNft) return;

    const updatedMyNftData = myNftData.map((user) => {
      //Remove NFT from seller
      if (user.walletAddress === seller) {
        const updatedCollections = user.groupedNfts
          .map((collection) => {
            if (collection.nfts.some((nft) => nft.nftokenID === nftId)) {
              const remainingNfts = collection.nfts.filter(
                (nft) => nft.nftokenID !== nftId
              );
              if (remainingNfts.length === 0) return null; //Remove empty collection
              return { ...collection, nfts: remainingNfts };
            }
            return collection;
          })
          .filter(Boolean); //Remove null entries

        return {
          ...user,
          groupedNfts: updatedCollections,
        };
      }

      //Add NFT to buyer
      else if (user.walletAddress === buyer) {
        const hasCollection = user.groupedNfts.some(
          (collection) => collection.collection === selectedNft.collectionName
        );

        return {
          ...user,
          groupedNfts: hasCollection
            ? user.groupedNfts.map((collection) => {
              if (collection.collection === selectedNft.collectionName) {
                return {
                  ...collection,
                  nfts: [...collection.nfts, selectedNft],
                };
              }
              return collection;
            })
            : [
              ...user.groupedNfts,
              {
                collection: selectedNft.collectionName,
                nfts: [selectedNft],
              },
            ],
        };
      }
      // Other users remain unchanged
      return user;
    });
    console.log("✅ updatedMyNftData--->", updatedMyNftData);
    setMyNftData(updatedMyNftData); // <- Apply state change
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-sm">
      {loading ? (
        <LoadingOverlay message="Loading..." />
      ) : (
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="backdrop-blur-md bg-white/90 dark:bg-gray-900/90 shadow-lg border-b border-gray-200/50 dark:border-gray-800/50 px-6 py-4 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
                    <Package className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">P2P NFT Widget</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Trade NFTs with room members</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 px-2 py-1 shadow-sm transition-all duration-300">
            <Tabs
              value={selectedIndex}
              onChange={(event, newIndex) => setSelectedIndex(newIndex)}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              sx={{
                "& .MuiTabs-indicator": {
                  backgroundColor: "#2563eb",
                  height: 3,
                  borderRadius: "2px",
                  transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
                },
                "& .MuiTab-root": {
                  color: "#64748b",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  textTransform: "none",
                  minHeight: 48,
                  padding: "14px 0",
                  borderRadius: "0.75rem 0.75rem 0 0",
                  margin: "0 0.5rem",
                  background: "none",
                  border: "none",
                  transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
                  "&.Mui-selected": {
                    color: "#2563eb",
                    background: "rgba(37,99,235,0.08)",
                    boxShadow: "0 2px 8px 0 rgba(37,99,235,0.05)",
                  },
                },
              }}
            >
              <Tab label="NFTs" className="text-gray-900 dark:text-white" />
              <Tab label="Offers" className="text-gray-900 dark:text-white" />
            </Tabs>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-transparent">
            <AnimatePresence mode="wait">
              {selectedIndex === 0 && (
                <motion.div
                  key="nfts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full"
                >
                  <NFTs
                    membersList={membersList}
                    myNftData={myNftData}
                    getImageData={getImageData}
                    wgtParameters={widgetApi.widgetParameters}
                    refreshOffers={refreshOffers}
                    widgetApi={widgetApi}
                    loadCollectionNFTs={handleLoadCollectionNFTs}
                    loadingCollections={loadingCollections}
                  />
                </motion.div>
              )}
              {selectedIndex === 1 && (
                <motion.div
                  key="offers"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full"
                >
                  <Offers
                    myWalletAddress={myOwnWalletAddress}
                    myDisplayName={widgetApi.widgetParameters.displayName}
                    membersList={membersList}
                    myNftData={myNftData}
                    widgetApi={widgetApi}
                    isRefreshing={isRefreshing}
                    updateUsersNFTs={updateUsersNFTs}
                    incomingOffer={incomingOffer}
                    cancelledOffer={cancelledOffer}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Image Cache Debug Panel */}
      <ImageCacheDebugPanel visible={showCacheDebug} />
    </div>
  );
};

export default MatrixClientProvider;
