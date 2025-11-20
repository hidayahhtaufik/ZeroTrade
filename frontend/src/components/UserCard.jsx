import React from 'react';
import EthosScoreBadge from './EthosScoreBadge';
import './UserCard.css';

/**
 * User Card Component
 * Displays user information with Ethos credibility score
 * Used in listings and offers to show seller/buyer credibility
 */
const UserCard = ({ 
  address, 
  label = 'User', 
  showFullAddress = false,
  size = 'medium',
  onClick 
}) => {
  if (!address) {
    return null;
  }

  const formatAddress = (addr) => {
    if (showFullAddress) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(38)}`;
  };

  return (
    <div className={`user-card ${size}`} onClick={onClick}>
      <div className="user-card-header">
        <span className="user-label">{label}</span>
      </div>
      
      <div className="user-card-content">
        <EthosScoreBadge 
          address={address} 
          size={size} 
          showDetails={true}
        />
      </div>
      
      <div className="user-card-footer">
        <div className="user-address-full" title={address}>
          {formatAddress(address)}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
