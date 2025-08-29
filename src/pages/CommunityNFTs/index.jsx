import React, { useState, useMemo } from "react";
import { ArrowLeft, User, Palette, Package, Search, X } from "lucide-react";
import nft_pic from "../../assets/nft.png";
import { useCachedImage, useImagePreloader } from "../../hooks/useCachedImage";
import NFTModal from "../../components/NFTModal";

const CommunityNFTs = ({ membersList, myNftData, wgtParameters, refreshOffers, widgetApi, loadCollectionNFTs }) => {
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const norm = (s) => (s || "").toLowerCase().trim();

  // ----- Identify me robustly -----
  const myMatrixUserId = useMemo(
    () => membersList?.find(m => m.name === wgtParameters.displayName)?.userId,
    [membersList, wgtParameters.displayName]
  );

  const myNameNorm = norm(wgtParameters.displayName);

  // Find all of "my" user entries (handle name casing mismatches, duplicates)
  const myEntries = useMemo(() => {
    const entries = (myNftData || []).filter(u =>
      norm(u.name) === myNameNorm || (myMatrixUserId && u.userId === myMatrixUserId)
    );
    return entries;
  }, [myNftData, myMatrixUserId, myNameNorm]);

  // Known self wallets (in case there are multiple)
  const myWalletSet = useMemo(() => {
    const set = new Set();
    myEntries.forEach(e => {
      if (e.walletAddress) set.add(norm(e.walletAddress));
    });
    return set;
  }, [myEntries]);

  // Main "me" record (first match) + wallet for modal actions
  const me = myEntries[0];
  const myWalletAddress = me?.walletAddress || "";

  // Exclude my own entry/users by (name || userId || wallet)
  const communityNftData = useMemo(() => {
    return (myNftData || []).filter(u => {
      const isMyName = norm(u.name) === myNameNorm;
      const isMyId = myMatrixUserId && u.userId === myMatrixUserId;
      const isMyWallet = u.walletAddress && myWalletSet.has(norm(u.walletAddress));
      return !(isMyName || isMyId || isMyWallet);
    });
  }, [myNftData, myMatrixUserId, myNameNorm, myWalletSet]);

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  };

  const handleCloseNFTModal = () => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  };

  const handleNFTAction = () => {
    if (refreshOffers) {
      refreshOffers();
    }
    handleCloseNFTModal();
  };

  // Group by collections across COMMUNITY users only
  const collectionsData = useMemo(() => {
    const collections = {};

    communityNftData.forEach(user => {
      user.groupedNfts?.forEach(group => {
        if (!group || !group.collection) return;

        const collectionKey =
          group.collectionKey ||
          (group.issuer && group.nftokenTaxon ? `${group.issuer}-${group.nftokenTaxon}` : null) ||
          group.collection;

        const collectionName = group.collection;

        if (!collections[collectionKey]) {
          collections[collectionKey] = {
            name: collectionName,
            collectionKey,
            issuer: group.issuer || null,
            nftokenTaxon: group.nftokenTaxon || null,
            totalNFTs: 0,
            members: new Set(),
            nfts: [],
            collectionInfo: group.collectionInfo || null,
            sampleImage: null
          };
        }

        collections[collectionKey].totalNFTs += group.nftCount || group.nfts?.length || 0;
        collections[collectionKey].members.add(user.name);

        if (group.nfts && group.nfts.length > 0) {
          collections[collectionKey].nfts.push(
            ...group.nfts.map(nft => ({
              ...nft,
              ownerName: user.name,
              ownerWallet: user.walletAddress,
              ownerUserId: user.userId
            }))
          );
        }

        if (!collections[collectionKey].sampleImage) {
          if (group.nfts && group.nfts.length > 0 && group.nfts[0].imageURI) {
            collections[collectionKey].sampleImage = group.nfts[0].imageURI;
          } else if (group.collectionInfo?.sampleImage) {
            collections[collectionKey].sampleImage = group.collectionInfo.sampleImage;
          } else if (group.collectionInfo?.sampleNft?.assets?.image) {
            collections[collectionKey].sampleImage = group.collectionInfo.sampleNft.assets.image;
          } else if (group.collectionInfo?.sampleNft?.metadata?.image) {
            collections[collectionKey].sampleImage = group.collectionInfo.sampleNft.metadata.image;
          } else if (group.collectionInfo?.sampleNft?.imageURI) {
            collections[collectionKey].sampleImage = group.collectionInfo.sampleNft.imageURI;
          }
        }
      });
    });

    Object.values(collections).forEach(collection => {
      if (collection && collection.members) {
        collection.memberCount = collection.members.size;
        collection.members = Array.from(collection.members);
      }
    });

    return Object.values(collections)
      .filter(Boolean)
      .sort((a, b) => b.totalNFTs - a.totalNFTs);
  }, [communityNftData]);

  // 🔎 Filter collections by owner (member) name
  const filteredCollections = useMemo(() => {
    const q = norm(searchTerm);
    if (!q) return collectionsData;
    return collectionsData.filter(c =>
      (c.members || []).some(m => norm(m).includes(q))
    );
  }, [collectionsData, searchTerm]);

  // Extract collection images for preloading (use filtered list)
  const collectionImages = useMemo(() => {
    return filteredCollections
      .map(collection => collection.sampleImage)
      .filter(image => {
        const isValid =
          image &&
          image.trim() !== '' &&
          image !== 'undefined' &&
          image !== 'null' &&
          image !== nft_pic;
        return isValid;
      });
  }, [filteredCollections]);

  // Preload collection images
  const { preloadProgress, isPreloading } = useImagePreloader(collectionImages, {
    enabled: true,
    delay: 500,
    batchSize: 3
  });

  if (selectedCollection) {
    return (
      <CollectionDetailView
        collection={selectedCollection}
        onBack={() => setSelectedCollection(null)}
        membersList={membersList}
        myNftData={communityNftData}      // community only
        wgtParameters={wgtParameters}
        refreshOffers={refreshOffers}
        widgetApi={widgetApi}
        loadCollectionNFTs={loadCollectionNFTs}
        myWalletAddress={myWalletAddress} // viewer wallet
        myWalletSet={myWalletSet}         // for extra safety filtering
      />
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-sm">
      <div className="h-full overflow-y-auto custom-scrollbar px-3 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
              <Package className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Community Collections</h2>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredCollections.length}
                  {filteredCollections.length !== collectionsData.length && (
                    <span className="text-gray-400 dark:text-gray-500"> / {collectionsData.length}</span>
                  )} collection{filteredCollections.length !== 1 ? 's' : ''} from other members
                </p>
                {isPreloading && (
                  <div className="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400">
                    <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <span>Loading images... ({Math.round(preloadProgress)}%)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search by owner name (collections list) */}
          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search collections by owner..."
                aria-label="Search collections by owner name"
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear search"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Collections Grid */}
        {filteredCollections.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCollections.map((collection, index) => (
              <CollectionCard
                key={collection.collectionKey || collection.name}
                collection={collection}
                index={index}
                onClick={() => setSelectedCollection(collection)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center shadow-lg">
              <Palette className="text-gray-400 w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {searchTerm ? "No matching collections" : "No Community Collections"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                {searchTerm
                  ? "Try a different owner name."
                  : "Other members haven’t shared NFT collections yet."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* NFT Modal */}
      <NFTModal
        isOpen={isNFTModalOpen}
        onClose={handleCloseNFTModal}
        nft={selectedNFT}
        isOwner={selectedNFT?.ownerWallet && myWalletAddress
          ? norm(selectedNFT.ownerWallet) === norm(myWalletAddress)
          : selectedNFT?.ownerName === wgtParameters.displayName}
        membersList={membersList}
        wgtParameters={wgtParameters}
        myWalletAddress={myWalletAddress}
        onAction={handleNFTAction}
        widgetApi={widgetApi}
      />
    </div>
  );
};

// Collection Card Component
const CollectionCard = ({ collection, index, onClick }) => {
  const { src: cachedImageSrc, isLoaded } = useCachedImage(
    collection.sampleImage,
    nft_pic,
    { eager: true }
  );

  return (
    <div
      className="cursor-pointer group animate-fade-in hover:scale-105 transition-all duration-300"
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={onClick}
    >
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Collection Image */}
        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
          <img
            src={cachedImageSrc || nft_pic}
            alt={collection.name}
            className={`w-full h-full object-cover transition-all duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } group-hover:scale-110`}
            onLoad={() => {}}
            onError={(e) => {
              e.target.src = nft_pic;
            }}
          />

          {!cachedImageSrc && (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              <Palette className="text-gray-400 w-16 h-16" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Click to explore
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collection Info */}
        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">
              {collection.name}
            </h3>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {collection.totalNFTs}
              </div>
              <div className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">
                NFTs
              </div>
            </div>

            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {collection.memberCount}
              </div>
              <div className="text-xs text-purple-600/70 dark:text-purple-400/70 font-medium">
                Owner{collection.memberCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Owners</h4>
            <div className="flex flex-wrap gap-2">
              {collection.members.slice(0, 3).map((member, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                  {member}
                </span>
              ))}
              {collection.members.length > 3 && (
                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                  +{collection.members.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Collection Detail View Component (with NFT owner search)
const CollectionDetailView = ({
  collection,
  onBack,
  membersList,
  myNftData,            // community only
  wgtParameters,
  refreshOffers,
  widgetApi,
  loadCollectionNFTs,
  myWalletAddress,      // viewer wallet
  myWalletSet           // Set of normalized self wallets
}) => {
  const [loadedNFTs, setLoadedNFTs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");

  const norm = (s) => (s || "").toLowerCase().trim();

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  };

  const handleCloseNFTModal = () => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  };

  const handleNFTAction = () => {
    if (refreshOffers) {
      refreshOffers();
    }
    handleCloseNFTModal();
  };

  // Load all NFTs for this collection from COMMUNITY users only
  React.useEffect(() => {
    const loadAllNFTsForCollection = async () => {
      setLoading(true);
      let allNFTs = [];

      for (const user of myNftData) {
        const userCollection = user.groupedNfts?.find(group =>
          group.collectionKey === collection.collectionKey ||
          (group.issuer === collection.issuer && group.nftokenTaxon === collection.nftokenTaxon) ||
          group.collection === collection.name
        );
        if (userCollection) {
          if (userCollection.nfts && userCollection.nfts.length > 0) {
            allNFTs.push(
              ...userCollection.nfts.map(nft => ({
                ...nft,
                ownerName: user.name,
                ownerWallet: user.walletAddress,
                ownerUserId: user.userId
              }))
            );
          } else if (userCollection.nftCount > 0) {
            try {
              const nfts = await loadCollectionNFTs(
                user.walletAddress,
                collection.name,
                user.name,
                user.userId,
                collection.issuer,
                collection.nftokenTaxon
              );
              if (nfts && nfts.length > 0) {
                allNFTs.push(
                  ...nfts.map(nft => ({
                    ...nft,
                    ownerName: user.name,
                    ownerWallet: user.walletAddress,
                    ownerUserId: user.userId
                  }))
                );
              }
            } catch (error) {
              console.error(`Error loading NFTs for ${user.name}:`, error);
            }
          }
        }
      }

      // 🔒 Safety filter: drop any of *my* NFTs that slipped through
      if (myWalletSet && myWalletSet.size > 0) {
        allNFTs = allNFTs.filter(nft => !myWalletSet.has(norm(nft.ownerWallet)));
      } else if (myWalletAddress) {
        allNFTs = allNFTs.filter(nft => norm(nft.ownerWallet) !== norm(myWalletAddress));
      }

      setLoadedNFTs(allNFTs);
      setLoading(false);
    };

    loadAllNFTsForCollection();
  }, [collection, myNftData, loadCollectionNFTs, myWalletAddress, myWalletSet]);

  // 🔎 Filter NFTs inside the collection by owner name
  const filteredNFTs = useMemo(() => {
    const q = norm(ownerSearch);
    if (!q) return loadedNFTs;
    return loadedNFTs.filter(n => norm(n.ownerName).includes(q));
  }, [loadedNFTs, ownerSearch]);

  return (
    <div className="h-full bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-sm">
      <div className="h-full overflow-y-auto custom-scrollbar px-3 py-6 space-y-6">
        {/* Header with Back Button + Search */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                <Palette className="text-white w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{collection.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredNFTs.length}
                  {filteredNFTs.length !== loadedNFTs.length && (
                    <span className="text-gray-400 dark:text-gray-500"> / {loadedNFTs.length}</span>
                  )} NFTs from {collection.memberCount} member{collection.memberCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Search NFTs by owner name */}
          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
                placeholder="Search NFTs by owner..."
                aria-label="Search NFTs by owner name"
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
              {ownerSearch && (
                <button
                  onClick={() => setOwnerSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear NFT owner search"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* NFTs Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Loading NFTs...
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Fetching NFTs from this collection
              </p>
            </div>
          </div>
        ) : filteredNFTs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredNFTs.map((nft, index) => (
              <NFTWithOwnerCard
                key={`${nft.nftokenID || nft.NFTokenID || nft.id || index}-${nft.ownerWallet || "owner"}`}
                nft={nft}
                index={index}
                wgtParameters={wgtParameters}
                onClick={handleNFTClick}
                myWalletAddress={myWalletAddress}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center">
              <span className="text-3xl">🔎</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No matching NFTs</h3>
              <p className="text-gray-600 dark:text-gray-400">Try a different owner name.</p>
            </div>
          </div>
        )}
      </div>

      {/* NFT Modal */}
      <NFTModal
        isOpen={isNFTModalOpen}
        onClose={handleCloseNFTModal}
        nft={selectedNFT}
        isOwner={selectedNFT?.ownerWallet && myWalletAddress
          ? norm(selectedNFT.ownerWallet) === norm(myWalletAddress)
          : selectedNFT?.ownerName === wgtParameters.displayName}
        membersList={membersList}
        wgtParameters={wgtParameters}
        myWalletAddress={myWalletAddress}
        onAction={handleNFTAction}
        widgetApi={widgetApi}
      />
    </div>
  );
};

// NFT with Owner Card Component
const NFTWithOwnerCard = ({ nft, index, wgtParameters, onClick, myWalletAddress }) => {
  const { src: cachedImageSrc, isLoaded } = useCachedImage(
    nft.imageURI || nft.metadata?.image,
    nft_pic,
    { eager: true }
  );

  const isMineByWallet =
    nft.ownerWallet && myWalletAddress
      ? (nft.ownerWallet || "").toLowerCase().trim() === (myWalletAddress || "").toLowerCase().trim()
      : false;

  return (
    <div
      className="cursor-pointer group animate-fade-in hover:scale-105 transition-all duration-300"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => onClick && onClick(nft)}
    >
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* NFT Image */}
        <div className="relative h-48">
          <img
            src={cachedImageSrc}
            alt={nft.metadata?.name || 'NFT'}
            className={`w-full h-full object-cover transition-all duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } group-hover:scale-110`}
          />

          {/* Owner badge */}
          <div className="absolute top-3 right-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-gray-900 dark:text-white shadow-lg border border-gray-200/50 dark:border-gray-700/50 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {nft.ownerName}
          </div>
        </div>

        {/* NFT Info */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
              {nft.metadata?.name || 'Unnamed NFT'}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {nft.collectionName || 'Unknown Collection'}
            </p>
          </div>

          {/* Owner info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {nft.ownerName}
              </span>
            </div>

            {/* Tradeable if NOT mine (wallet-based check first, fallback to displayName) */}
            {(!isMineByWallet && nft.ownerName !== wgtParameters.displayName) && (
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full text-xs font-semibold">
                Tradeable
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityNFTs;
