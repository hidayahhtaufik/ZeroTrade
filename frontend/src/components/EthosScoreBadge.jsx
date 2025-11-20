import React, { useState, useEffect } from 'react';
import { getEthosScore, formatScore, getScoreColor } from '../services/ethosService';
import './EthosScoreBadge.css';

/**
 * Ethos Score Badge Component
 * Displays user credibility score with visual indicator
 * Similar to the reference image with circular avatar and score badge
 */
const EthosScoreBadge = ({ address, size = 'medium', showDetails = false }) => {
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      loadScore();
    }
  }, [address]);

  const loadScore = async () => {
    try {
      setLoading(true);
      const data = await getEthosScore(address);
      setScoreData(data);
    } catch (error) {
      console.error('Failed to load Ethos score:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return <div className="ethos-badge-placeholder">No address</div>;
  }

  if (loading) {
    return (
      <div className={`ethos-badge-container ${size}`}>
        <div className="ethos-avatar-wrapper loading">
          <div className="ethos-avatar">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!scoreData) {
    return null;
  }

  const { score, level } = scoreData;
  const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;

  return (
    <div className={`ethos-badge-container ${size}`}>
      <div className="ethos-badge-simple" style={{ 
        backgroundColor: level.color + '20',
        borderColor: level.color
      }}>
        <img 
          src={avatarUrl} 
          alt={`${address.substring(0, 6)} avatar`} 
          crossOrigin="anonymous"
          className="ethos-avatar-simple"
        />
        <div className="ethos-info">
          <div className="ethos-score-simple" style={{ color: level.color }}>
            {formatScore(score)}
          </div>
          <div className="ethos-level-simple" style={{ color: level.color }}>
            {level.name.toUpperCase()}
          </div>
        </div>
      </div>
      
      {showDetails && (
        <div className="ethos-details">
          <div className="ethos-address">
            {address.substring(0, 6)}...{address.substring(38)}
          </div>
          {!scoreData.hasScore && (
            <div className="ethos-new-user">New User</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EthosScoreBadge;
