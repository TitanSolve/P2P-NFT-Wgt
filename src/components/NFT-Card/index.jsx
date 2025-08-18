import React from "react";
import nft_pic from "../../assets/nft.png";
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { Palette, Sparkles, CheckCircle } from "lucide-react";
import { useCachedImage } from "../../hooks/useCachedImage";

const NFTCard = ({ myNftData, isGroup, isImgOnly }) => {
    // Handle different data structures for groups and individual NFTs
    let imageUrl = nft_pic; // Default fallback
    let nftName = 'Unknown NFT';
    let collectionName = 'Unknown Collection';
    let itemCount = 0;
    
    if (isGroup) {
        // For groups, check if NFTs are loaded or use collection info
        if (myNftData.nfts && myNftData.nfts.length > 0) {
            imageUrl = myNftData.nfts[0].imageURI || nft_pic;
            nftName = myNftData.nfts[0].metadata?.name || 'NFT Collection';
            itemCount = myNftData.nfts.length;
        } else {
            // Use collection metadata when NFTs aren't loaded yet
            const sampleNft = myNftData.collectionInfo?.sampleNft;
            if (sampleNft) {
                // Prioritize Bithomp CDN URLs over IPFS URLs
                imageUrl = sampleNft.assets?.image || 
                          sampleNft.metadata?.image ||
                          sampleNft.imageURI || nft_pic;
                nftName = sampleNft.metadata?.name || myNftData.collection || 'NFT Collection';
            } else {
                imageUrl = myNftData.collectionInfo?.sampleImage || 
                          myNftData.collectionInfo?.image || nft_pic;
                nftName = myNftData.collection || 'NFT Collection';
            }
            itemCount = myNftData.nftCount || 0;
        }
        collectionName = myNftData.collection || 'Collection';
    } else {
        // For individual NFTs
        imageUrl = myNftData.imageURI || nft_pic;
        nftName = myNftData.metadata?.name || 'NFT';
        collectionName = myNftData.collectionName || 'NFT';
    }

    const { src: cachedImageSrc, isLoading: imageLoading, isLoaded } = useCachedImage(
        imageUrl, // Always pass the imageUrl, even if it's the fallback
        nft_pic, // Use nft_pic as fallback
        { eager: true }
    );

    return (
        <div className={`relative group ${!isImgOnly ? 'cursor-pointer hover:scale-105 transition-all duration-300' : ''}`}>
            <div className={`relative overflow-hidden rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-gray-700/50 ${!isImgOnly ? 'hover:shadow-xl transition-all duration-300' : ''}`}>
                {/* NFT Image */}
                <div className="relative">
                    {/* Group Badge */}
                    {isGroup && (
                        <div className="absolute top-3 right-3 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-gray-900 dark:text-white shadow-lg border border-gray-200/50 dark:border-gray-700/50 flex items-center gap-1.5">
                            <Sparkles className="text-yellow-500 w-3 h-3" />
                            <span>{itemCount}</span>
                        </div>
                    )}

                    {/* Loading Skeleton */}
                    {!isLoaded && (
                        <div className="relative">
                            <Skeleton
                                className="w-full h-48 sm:h-56 md:h-64 lg:h-72 rounded-2xl"
                                baseColor="#e5e7eb"
                                highlightColor="#f3f4f6"
                                duration={1.5}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
                        </div>
                    )}

                    {/* NFT Image */}
                    <img
                        src={cachedImageSrc}
                        alt="NFT"
                        onLoad={() => {}}
                        onError={() => {}}
                        draggable={false}
                        className={`w-full h-48 sm:h-56 md:h-64 lg:h-72 object-cover transition-all duration-500 ${
                            isLoaded ? 'opacity-100' : 'opacity-0'
                        } ${!isImgOnly ? 'group-hover:scale-110' : ''}`}
                    />

                    {/* Overlay on hover */}
                    {!isImgOnly && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl p-4 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                Available
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            Click to trade
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Card Content (if not image only) */}
                {!isImgOnly && (
                    <div className="p-5 space-y-4">
                        {/* NFT Name */}
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">
                                {nftName}
                            </h3>
                            {isGroup && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Collection of {itemCount} NFTs
                                </p>
                            )}
                        </div>

                        {/* Collection Info */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                                    <Palette className="text-white w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {collectionName}
                                </span>
                            </div>
                            
                            {/* Status Badge */}
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Active
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default NFTCard;
