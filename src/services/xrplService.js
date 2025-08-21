import {
    Client
} from 'xrpl';
import API_URLS from '../config.js';

const XRPL_NODE = 'wss://s.altnet.rippletest.net:51233'; // Using testnet, change to mainnet for production
const BITHOMP_API_BASE = 'https://bithomp.com/api/v2';

const isValidAmount = (amount) => {
    if (!amount) return false;
    if (typeof amount === 'string') return true; // XRP amount
    if (typeof amount === 'object') {
        return (
            amount.value &&
            amount.currency &&
            amount.issuer &&
            !isNaN(parseFloat(amount.value)) &&
            parseFloat(amount.value) > 0
        );
    }
    return false;
};

const isValidOffer = (offer) => {
    if (!offer) return false;

    // Check if the offer has valid amounts
    if (!isValidAmount(offer.taker_gets) || !isValidAmount(offer.taker_pays)) {
        return false;
    }

    // Check if the offer has a valid sequence number
    if (!offer.seq || typeof offer.seq !== 'number') {
        return false;
    }

    // Check if the offer has valid flags
    if (typeof offer.flags !== 'number') {
        return false;
    }

    // Check if the offer has a valid quality
    if (offer.quality && (isNaN(parseFloat(offer.quality)) || parseFloat(offer.quality) <= 0)) {
        return false;
    }

    return true;
};

export const getWalletOffers = async (walletAddress) => {
    try {
        // Create a new client
        const client = new Client(XRPL_NODE);

        // Connect to the XRPL
        await client.connect();

        // First, get the current ledger index
        const ledgerResponse = await client.request({
            command: 'ledger',
            ledger_index: 'validated'
        });

        const currentLedgerIndex = ledgerResponse.result.ledger_index;

        // Create the request with the current ledger index
        const request = {
            command: 'account_offers',
            account: walletAddress,
            ledger_index: currentLedgerIndex,
            limit: 400 // Adjust based on your needs
        };

        // Send the request
        const response = await client.request(request);

        // Disconnect from the client
        await client.disconnect();

        // Filter and process valid offers
        const validOffers = response.result.offers.filter(isValidOffer);

        // Process and return the offers
        return {
            buyOffers: validOffers.filter(offer => offer.flags === 0),
            sellOffers: validOffers.filter(offer => offer.flags === 1),
            rawOffers: validOffers,
            totalOffers: validOffers.length,
            invalidOffers: response.result.offers.length - validOffers.length,
            ledgerIndex: currentLedgerIndex
        };
    } catch (error) {
        console.error('Error fetching wallet offers:', error);
        throw error;
    }
};

/**
 * Fetch NFT offers for a given address from Bithomp API
 * @param {string} address - The XRPL address
 * @param {Object} options - Additional options for the API call
 * @returns {Promise<Object>} NFT offers data
 */
export const getNFTOffers = async (address, options = {}) => {
    try {
        const {
            list = null, // null (default), 'counterOffers', 'privatelyOfferedToAddress'
                nftoken = true, // Include NFT token data and metadata
                offersValidate = true, // Include validation status
                assets = true // Include asset URLs (requires Standard API plan)
        } = options;

        // Build query parameters
        const queryParams = new URLSearchParams();
        if (list) queryParams.append('list', list);
        if (nftoken) queryParams.append('nftoken', 'true');
        if (offersValidate) queryParams.append('offersValidate', 'true');
        if (assets) queryParams.append('assets', 'true');

        const url = `${BITHOMP_API_BASE}/nft-offers/${address}?${queryParams.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-bithomp-token': API_URLS.bithompToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Bithomp API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // ✅ Filter only valid offers
        const validOffers = data.nftOffers ? data.nftOffers.filter(o => o.valid === true) : [];

        return {
            ...data,
            nftOffers: validOffers
        };

        // return data;
    } catch (error) {
        console.error('Error fetching NFT offers from Bithomp:', error);
        throw error;
    }
};

/**
 * Fetch all NFT offers for an address (both created by user and offers on user's NFTs)
 * @param {string} address - The XRPL address
 * @returns {Promise<Object>} Combined NFT offers data
 */
export const getAllNFTOffers = async (address) => {
    try {
        // Fetch offers created by the user (default list)
        const userCreatedOffers = await getNFTOffers(address, {
            list: null, // Default - offers created by the user
            nftoken: true,
            offersValidate: true,
            assets: true
        });
        console.log('User Created Offers:', userCreatedOffers);

        // Fetch counter offers (offers made on the user's NFTs)
        const counterOffers = await getNFTOffers(address, {
            list: 'counterOffers',
            nftoken: true,
            offersValidate: true,
            assets: true
        });
        console.log('Counter Offers:', counterOffers);

        // Fetch privately offered to address (brokers, private offers, NFT transfers)
        const privateOffers = await getNFTOffers(address, {
            list: 'privatelyOfferedToAddress',
            nftoken: true,
            offersValidate: true,
            assets: true
        });
        console.log('Private Offers:', privateOffers);

        return {
            userCreatedOffers: userCreatedOffers.nftOffers || [],
            counterOffers: counterOffers.nftOffers || [],
            privateOffers: privateOffers.nftOffers || [],
            summary: {
                totalUserCreated: userCreatedOffers.nftOffers?.length || 0,
                totalCounterOffers: counterOffers.nftOffers?.length || 0,
                totalPrivateOffers: privateOffers.nftOffers?.length || 0,
                totalOffers: (userCreatedOffers.nftOffers?.length || 0) +
                    (counterOffers.nftOffers?.length || 0) +
                    (privateOffers.nftOffers?.length || 0)
            },
            owner: address,
            ownerDetails: userCreatedOffers.ownerDetails || null
        };
    } catch (error) {
        console.error('Error fetching all NFT offers:', error);
        throw error;
    }
};

/**
 * Helper function to filter valid NFT offers
 * @param {Array} offers - Array of NFT offers
 * @returns {Array} Valid offers only
 */
export const getValidNFTOffers = (offers) => {
    if (!Array.isArray(offers)) return [];
    return offers.filter(offer => offer.valid !== false);
};

/**
 * Helper function to filter invalid NFT offers
 * @param {Array} offers - Array of NFT offers
 * @returns {Array} Invalid offers only
 */
export const getInvalidNFTOffers = (offers) => {
    if (!Array.isArray(offers)) return [];
    return offers.filter(offer => offer.valid === false);
};

/**
 * Helper function to get offers by amount range
 * @param {Array} offers - Array of NFT offers
 * @param {string} minAmount - Minimum amount in drops
 * @param {string} maxAmount - Maximum amount in drops
 * @returns {Array} Filtered offers
 */
export const getOffersByAmountRange = (offers, minAmount, maxAmount) => {
    if (!Array.isArray(offers)) return [];
    return offers.filter(offer => {
        const amount = parseInt(offer.amount);
        const min = parseInt(minAmount);
        const max = parseInt(maxAmount);
        return amount >= min && amount <= max;
    });
};

/**
 * Helper function to convert XRP drops to XRP
 * @param {string} drops - Amount in drops
 * @returns {number} Amount in XRP
 */
export const dropsToXrp = (drops) => {
    return parseInt(drops) / 1000000;
};