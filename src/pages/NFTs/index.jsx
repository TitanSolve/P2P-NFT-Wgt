import React, { useState, useMemo } from "react";
import { ArrowLeft, User, Palette, Package } from "lucide-react";
import nft_pic from "../../assets/nft.png";
import { useCachedImage, useImagePreloader } from "../../hooks/useCachedImage";
import NFTModal from "../../components/NFTModal";

const NFTs = ({ membersList, myNftData, wgtParameters, refreshOffers, widgetApi, loadCollectionNFTs }) => {
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);

  // Get current user's wallet address
  const myWalletAddress = membersList
    ?.find(member => member.name === wgtParameters.displayName)
    ?.userId?.split(":")[0]?.replace("@", "") || "";

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  };

  const handleCloseNFTModal = () => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  };

  const handleNFTAction = () => {
    // Refresh offers or reload data after NFT actions
    if (refreshOffers) {
      refreshOffers();
    }
    handleCloseNFTModal();
  };

  // Transform data to group by collections across all users
  const collectionsData = useMemo(() => {
    const collections = {};
    
    console.log('🔍 Processing myNftData for collections:', myNftData);
    
    myNftData.forEach(user => {
      console.log(`👤 Processing user ${user.name} with collections:`, user.groupedNfts);
      
      user.groupedNfts?.forEach(group => {
        // Ensure we have valid group data
        if (!group || !group.collection) {
          console.warn('⚠️ Invalid group data:', group);
          return;
        }
        
        // Use collectionKey (issuer-taxon) for proper grouping, fallback to collection name
        const collectionKey = group.collectionKey || 
                             (group.issuer && group.nftokenTaxon ? `${group.issuer}-${group.nftokenTaxon}` : null) || 
                             group.collection;
        const collectionName = group.collection;
        
        console.log(`🏷️ Processing collection: ${collectionName} with key: ${collectionKey} (issuer: ${group.issuer}, taxon: ${group.nftokenTaxon})`);
        
        if (!collections[collectionKey]) {
          collections[collectionKey] = {
            name: collectionName,
            collectionKey: collectionKey,
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
        
        // Add NFTs if they're loaded
        if (group.nfts && group.nfts.length > 0) {
          collections[collectionKey].nfts.push(...group.nfts.map(nft => ({
            ...nft,
            ownerName: user.name,
            ownerWallet: user.walletAddress,
            ownerUserId: user.userId
          })));
        }
        
        // Get sample image for collection card
        if (!collections[collectionKey].sampleImage) {
          // Try multiple sources for the sample image, prioritizing CDN URLs
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
    
    // Convert Set to array for member count
    Object.values(collections).forEach(collection => {
      if (collection && collection.members) {
        collection.memberCount = collection.members.size;
        collection.members = Array.from(collection.members);
      }
    });
    
    const result = Object.values(collections)
      .filter(collection => collection != null) // Filter out any null/undefined collections
      .sort((a, b) => b.totalNFTs - a.totalNFTs);
    console.log('✅ Final collections data:', result.map(c => ({
      name: c.name,
      key: c.collectionKey,
      issuer: c.issuer,
      taxon: c.nftokenTaxon,
      totalNFTs: c.totalNFTs,
      memberCount: c.memberCount
    })));
    
    return result;
  }, [myNftData]);

  // Extract collection images for preloading
  const collectionImages = useMemo(() => {
    const images = collectionsData
      .map(collection => {
        console.log(`🔍 Extracting image for collection ${collection.name}:`, {
          sampleImage: collection.sampleImage,
          collection: collection
        });
        return collection.sampleImage;
      })
      .filter(image => {
        const isValid = image && 
                       image.trim() !== '' && 
                       image !== 'undefined' && 
                       image !== 'null' && 
                       image !== nft_pic;
        console.log(`🖼️ Image validation:`, { image, isValid });
        return isValid;
      });
    
    console.log(`📊 Final collection images for preload:`, images);
    return images;
  }, [collectionsData]);

  // Preload collection images
  const { preloadProgress, isPreloading } = useImagePreloader(collectionImages, {
    enabled: true,
    delay: 500, // Wait 500ms before starting preload
    batchSize: 3
  });

  if (selectedCollection) {
    return (
      <CollectionDetailView
        collection={selectedCollection}
        onBack={() => setSelectedCollection(null)}
        membersList={membersList}
        myNftData={myNftData}
        wgtParameters={wgtParameters}
        refreshOffers={refreshOffers}
        widgetApi={widgetApi}
        loadCollectionNFTs={loadCollectionNFTs}
      />
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-sm">
      <div className="h-full overflow-y-auto custom-scrollbar px-3 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
            <Package className="text-white w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Collections</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {collectionsData.length} collection{collectionsData.length !== 1 ? 's' : ''} available in this room
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

        {/* Collections Grid */}
        {collectionsData.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {collectionsData.map((collection, index) => (
              <CollectionCard
                key={collection.name}
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
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">No Collections Found</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                No NFT collections are available in this room yet. Be the first to share your collection!
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
        isOwner={selectedNFT?.ownerName === wgtParameters.displayName}
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
  // Use cached image for collection sample image
  const { src: cachedImageSrc, isLoaded } = useCachedImage(
    collection.sampleImage, // Always pass the sampleImage
    nft_pic, // Use nft_pic as fallback
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
          
          {/* Fallback when no image */}
          {!cachedImageSrc && (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              <Palette className="text-gray-400 w-16 h-16" />
            </div>
          )}
          
          {/* Overlay */}
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

// Collection Detail View Component  
const CollectionDetailView = ({ collection, onBack, membersList, myNftData, wgtParameters, refreshOffers, widgetApi, loadCollectionNFTs }) => {
  const [loadedNFTs, setLoadedNFTs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);

  // Get current user's wallet address
  const myWalletAddress = membersList
    ?.find(member => member.name === wgtParameters.displayName)
    ?.userId?.split(":")[0]?.replace("@", "") || "";

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  };

  const handleCloseNFTModal = () => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  };

  const handleNFTAction = () => {
    // Refresh offers or reload data after NFT actions
    if (refreshOffers) {
      refreshOffers();
    }
    handleCloseNFTModal();
  };

  // Load all NFTs for this collection from all users
  React.useEffect(() => {
    const loadAllNFTsForCollection = async () => {
      setLoading(true);
      const allNFTs = [];
      
      for (const user of myNftData) {
        // Find the collection by collectionKey for proper matching, fallback to name
        const userCollection = user.groupedNfts?.find(group => 
          group.collectionKey === collection.collectionKey || 
          (group.issuer === collection.issuer && group.nftokenTaxon === collection.nftokenTaxon) ||
          group.collection === collection.name
        );
        if (userCollection) {
          if (userCollection.nfts && userCollection.nfts.length > 0) {
            // NFTs already loaded
            allNFTs.push(...userCollection.nfts.map(nft => ({
              ...nft,
              ownerName: user.name,
              ownerWallet: user.walletAddress,
              ownerUserId: user.userId
            })));
          } else if (userCollection.nftCount > 0) {
            // Need to load NFTs
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
                allNFTs.push(...nfts.map(nft => ({
                  ...nft,
                  ownerName: user.name,
                  ownerWallet: user.walletAddress,
                  ownerUserId: user.userId
                })));
              }
            } catch (error) {
              console.error(`Error loading NFTs for ${user.name}:`, error);
            }
          }
        }
      }
      
      setLoadedNFTs(allNFTs);
      setLoading(false);
    };

    loadAllNFTsForCollection();
  }, [collection, myNftData, loadCollectionNFTs]);

  return (
    <div className="h-full bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-sm">
      <div className="h-full overflow-y-auto custom-scrollbar px-3 py-6 space-y-6">
        {/* Header with Back Button */}
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
                {collection.totalNFTs} NFTs from {collection.memberCount} member{collection.memberCount !== 1 ? 's' : ''}
              </p>
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
        ) : loadedNFTs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loadedNFTs.map((nft, index) => (
              <NFTWithOwnerCard
                key={`${nft.nftokenID}-${nft.ownerWallet}`}
                nft={nft}
                index={index}
                wgtParameters={wgtParameters}
                membersList={membersList}
                refreshOffers={refreshOffers}
                widgetApi={widgetApi}
                onClick={handleNFTClick}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center">
              <span className="text-3xl">🎨</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                No NFTs Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No NFTs are currently available in this collection
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
        isOwner={selectedNFT?.ownerName === wgtParameters.displayName}
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
const NFTWithOwnerCard = ({ nft, index, wgtParameters, onClick }) => {
  // Use cached image for NFT
  const { src: cachedImageSrc, isLoaded } = useCachedImage(
    nft.imageURI || nft.metadata?.image, // Always pass the image URL
    nft_pic, // Use nft_pic as fallback
    { eager: true }
  );
  
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
            
            {nft.ownerName !== wgtParameters.displayName && (
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

export default NFTs;
