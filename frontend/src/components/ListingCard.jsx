import React from 'react';
import { ethers } from 'ethers';
import EthosScoreBadge from './EthosScoreBadge';
import './ListingCard.css';

const ListingCard = ({ listing, onView, onMakeOffer, isOwner, viewMode = 'grid' }) => {
  const { 
    id, 
    seller, 
    title, 
    description, 
    category, 
    imageUrl,
    status, 
    createdAt,
    offersCount,
    // Web3 fields
    tokenSymbol,
    fdv,
    dealType,
    trancheSize,
    vestingMonths
  } = listing;

  const formatFDV = (fdvValue) => {
    if (!fdvValue) return '$0';
    try {
      const ethValue = parseFloat(ethers.formatEther(fdvValue));
      // Convert to billions/millions for display
      if (ethValue >= 1000000000) {
        return `$${(ethValue / 1000000000).toLocaleString(undefined, {maximumFractionDigits: 1})}B`;
      } else if (ethValue >= 1000000) {
        return `$${(ethValue / 1000000).toLocaleString(undefined, {maximumFractionDigits: 1})}M`;
      } else if (ethValue >= 1000) {
        return `$${(ethValue / 1000).toLocaleString(undefined, {maximumFractionDigits: 1})}K`;
      }
      return `$${ethValue.toLocaleString()}`;
    } catch {
      return '$0';
    }
  };

  const formatTrancheValue = (trancheSize) => {
    if (!trancheSize) return '$0';
    const num = parseInt(trancheSize);
    if (num >= 1000000) {
      return `$${(num / 1000000).toLocaleString(undefined, {maximumFractionDigits: 1})}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toLocaleString(undefined, {maximumFractionDigits: 1})}K`;
    }
    return `$${num.toLocaleString()}`;
  };

  const getDealTypeLabel = (type) => {
    const types = {
      0: 'SPOT',
      1: 'VESTING',
      2: 'SAFT',
      3: 'TOKEN SALE',
      4: 'PRIVATE SALE'
    };
    return types[type] || 'SPOT';
  };

  const formatDate = (timestamp) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };
  
  // Generate default image based on token symbol
  const getDefaultImage = () => {
    const colors = ['#FDB022', '#0047FF', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b'];
    const colorIndex = tokenSymbol ? tokenSymbol.charCodeAt(0) % colors.length : 0;
    return colors[colorIndex];
  };

  // OpenSea-style card with WTS/WTB sections
  return (
    <div className="listing-card-opensea" onClick={() => onView(listing)}>
      {/* Large Image Section */}
      <div className="card-image-section">
        {imageUrl && (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) ? (
          <img src={imageUrl} alt={tokenSymbol || title} className="card-image-uploaded" />
        ) : (
          <div className="card-image-bg" style={{ background: getDefaultImage() }}>
            <div className="token-icon-large">
              {tokenSymbol ? tokenSymbol.charAt(0).toUpperCase() : '🪙'}
            </div>
          </div>
        )}
        {status === 1 && (
          <div className="sold-overlay">
            <span className="sold-badge-large">✅ SOLD</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="card-content-opensea">
        {/* Token Title */}
        <h3 className="token-name-large">{tokenSymbol || title}</h3>

        {/* WTS Section - Seller (Red Border) */}
        <div className="profile-section wts-section">
          <div className="section-header">
            <span className="section-label">🔴 WTS (WANTS TO SELL)</span>
          </div>
          <div className="profile-content">
            <EthosScoreBadge address={seller} size="small" />
            <div className="profile-address">
              {isOwner ? '👤 You (Seller)' : `${seller.substring(0, 6)}...${seller.substring(38)}`}
            </div>
          </div>
        </div>

        {/* WTB Section - Buyer (Green Border) - Only for non-owners */}
        {!isOwner && status === 0 && (
          <div className="profile-section wtb-section">
            <div className="section-header">
              <span className="section-label">🟢 WTB (WANTS TO BUY)</span>
            </div>
            <div className="profile-content">
              <div className="buyer-placeholder">
                <div className="buyer-icon">👤</div>
                <div className="buyer-text">You (Potential Buyer)</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid-opensea">
          <div className="stat-item-opensea">
            <span className="stat-label-opensea">FDV</span>
            <span className="stat-value-opensea">{formatFDV(fdv)}</span>
          </div>
          <div className="stat-item-opensea">
            <span className="stat-label-opensea">AMOUNT</span>
            <span className="stat-value-opensea">{formatTrancheValue(trancheSize)}</span>
          </div>
          <div className="stat-item-opensea">
            <span className="stat-label-opensea">DEAL TYPE</span>
            <span className="stat-value-opensea">{getDealTypeLabel(dealType)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="card-footer-opensea">
          <span className="footer-date">Listed {formatDate(createdAt)}</span>
          <span className="footer-offers">{offersCount} offer{offersCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Action Button */}
        {!isOwner && status === 0 && (
          <button 
            className="btn-make-offer-opensea"
            onClick={(e) => {
              e.stopPropagation();
              onMakeOffer(listing);
            }}
          >
            💼 Make Offer
          </button>
        )}
        
        {status === 1 && (
          <div className="sold-indicator">
            ✅ This item has been sold
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingCard;
