// Test file to verify Bithomp NFT offers integration
// You can run this in the browser console or add it to your component for testing

import { getAllNFTOffers } from './src/services/xrplService';

// Test function to verify the API integration
export const testBithompAPI = async (walletAddress) => {
  try {
    console.log('🧪 Testing Bithomp NFT Offers API...');
    console.log('📍 Wallet Address:', walletAddress);
    
    const startTime = Date.now();
    const result = await getAllNFTOffers(walletAddress);
    const endTime = Date.now();
    
    console.log('✅ API Response received in', endTime - startTime, 'ms');
    console.log('📊 Summary:', result.summary);
    console.log('📤 User Created Offers:', result.userCreatedOffers.length);
    console.log('📥 Counter Offers:', result.counterOffers.length);
    console.log('🔒 Private Offers:', result.privateOffers.length);
    
    // Log details of each type
    if (result.userCreatedOffers.length > 0) {
      console.log('📤 First User Created Offer:', result.userCreatedOffers[0]);
    }
    
    if (result.counterOffers.length > 0) {
      console.log('📥 First Counter Offer:', result.counterOffers[0]);
    }
    
    if (result.privateOffers.length > 0) {
      console.log('🔒 First Private Offer:', result.privateOffers[0]);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Example usage:
// testBithompAPI('rYourWalletAddressHere');
