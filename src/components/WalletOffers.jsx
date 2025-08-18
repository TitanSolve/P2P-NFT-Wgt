import React, { useState, useEffect, useCallback } from 'react';
import { getWalletOffers } from '../services/xrplService';

const WalletOffers = ({ walletAddress }) => {
    const [offers, setOffers] = useState({ 
        buyOffers: [], 
        sellOffers: [], 
        rawOffers: [],
        totalOffers: 0,
        invalidOffers: 0,
        ledgerIndex: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchOffers = useCallback(async () => {
        if (!walletAddress) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const result = await getWalletOffers(walletAddress);
            setOffers(result);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    const formatAmount = (amount) => {
        if (typeof amount === 'string') {
            return `${amount} XRP`;
        }
        return `${amount.value} ${amount.currency} (${amount.issuer})`;
    };

    if (loading) return <div>Loading offers...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="wallet-offers">
            <div className="header-section">
                <h2>Wallet Offers</h2>
                <div className="controls">
                    <button onClick={fetchOffers} disabled={loading}>
                        Refresh Offers
                    </button>
                    {lastUpdated && (
                        <span className="last-updated">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>

            <div className="offer-stats">
                <p>Total Active Offers: {offers.totalOffers}</p>
                <p>Invalid Offers Filtered: {offers.invalidOffers}</p>
                <p>Current Ledger Index: {offers.ledgerIndex}</p>
            </div>
            
            <div className="offers-section">
                <h3>Buy Offers ({offers.buyOffers.length})</h3>
                {offers.buyOffers.length === 0 ? (
                    <p>No active buy offers found</p>
                ) : (
                    <ul>
                        {offers.buyOffers.map((offer, index) => (
                            <li key={index} className="offer-item">
                                <div className="offer-details">
                                    <div>Buy: {formatAmount(offer.taker_gets)}</div>
                                    <div>Pay: {formatAmount(offer.taker_pays)}</div>
                                    {offer.quality && (
                                        <div>Quality: {offer.quality}</div>
                                    )}
                                    <div>Sequence: {offer.seq}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="offers-section">
                <h3>Sell Offers ({offers.sellOffers.length})</h3>
                {offers.sellOffers.length === 0 ? (
                    <p>No active sell offers found</p>
                ) : (
                    <ul>
                        {offers.sellOffers.map((offer, index) => (
                            <li key={index} className="offer-item">
                                <div className="offer-details">
                                    <div>Sell: {formatAmount(offer.taker_gets)}</div>
                                    <div>Receive: {formatAmount(offer.taker_pays)}</div>
                                    {offer.quality && (
                                        <div>Quality: {offer.quality}</div>
                                    )}
                                    <div>Sequence: {offer.seq}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default WalletOffers; 