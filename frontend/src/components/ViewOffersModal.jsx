import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import EthosScoreBadge from './EthosScoreBadge';
import './ViewOffersModal.css';

const ViewOffersModal = ({ listing, contract, account, onClose, onSuccess }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState({});
  const [rejecting, setRejecting] = useState({});
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadOffers();
  }, [listing.id]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const offerIds = await contract.getListingOffers(listing.id);
      console.log(`📦 Found ${offerIds.length} offer IDs:`, offerIds.map(id => Number(id)));
      
      const offersData = [];
      for (let offerId of offerIds) {
        try {
          console.log(`🔍 Loading offer ${Number(offerId)}...`);
          const result = await contract.getOfferInfo(offerId);
          
          // Contract returns: (listingId, buyer, offerType, customTerms, status, createdAt, escrowAmount)
          // BUT! Result only has 6 items (indices 0-5), so escrowAmount is at index 6 which causes "out of range"
          // Actually the contract DOES return it but ethers Result object has it at a different position
          console.log('📦 Raw result:', result);
          console.log('📦 Result length:', result.length);
          
          // Access all 7 values - they exist in the Result proxy
          const listingId = result[0];
          const buyer = result[1];
          const offerType = result[2];
          const customTerms = result[3];
          const status = result[4];
          const createdAt = result[5];
          const escrowAmount = result[6];
          
          console.log('📦 Parsed values:', { listingId, buyer, offerType, customTerms, status, createdAt, escrowAmount });
          
          const offerData = {
            id: Number(offerId),
            listingId: Number(listingId),
            buyer: String(buyer),
            offerType: String(offerType),
            customTerms: String(customTerms),
            status: Number(status),
            createdAt: createdAt,
            escrowAmount: escrowAmount
          };
          
          console.log(`✅ Loaded offer ${Number(offerId)}:`, offerData);
          offersData.push(offerData);
        } catch (err) {
          console.error(`❌ Error loading offer ${Number(offerId)}:`, err);
          console.error('Error details:', err.message);
          console.error('Error stack:', err.stack);
          
          // Try alternative approach - use toArray() if available
          try {
            console.log('🔄 Trying alternative access method...');
            const result = await contract.getOfferInfo(offerId);
            const values = result.toArray ? result.toArray() : [...result];
            console.log('📦 Array values:', values);
            
            const offerData = {
              id: Number(offerId),
              listingId: Number(values[0]),
              buyer: String(values[1]),
              offerType: String(values[2]),
              customTerms: String(values[3]),
              status: Number(values[4]),
              createdAt: values[5],
              escrowAmount: values[6] || 0n
            };
            
            console.log(`✅ Loaded offer ${Number(offerId)} (alternative):`, offerData);
            offersData.push(offerData);
          } catch (retryErr) {
            console.error(`❌ Alternative method also failed:`, retryErr);
          }
        }
      }
      
      // Sort by newest first
      offersData.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      setOffers(offersData);
      console.log(`✅ Successfully loaded ${offersData.length} offers out of ${offerIds.length} total`);
    } catch (err) {
      console.error('❌ Error loading offers:', err);
      setError('Failed to load offers: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };


  const handleAcceptOffer = async (offerId) => {
    try {
      setAccepting(prev => ({ ...prev, [offerId]: true }));
      setError('');
      setSuccessMessage('');
      
      console.log('✅ Accepting offer:', offerId);
      
      const tx = await contract.acceptOffer(offerId);
      console.log('⏳ Waiting for confirmation...');
      
      await tx.wait();
      console.log('✅ Offer accepted and trade completed!');
      
      setSuccessMessage('🎉 Offer accepted! Trade completed successfully. Funds have been transferred. This listing is now SOLD.');
      
      // Close modal immediately and reload
      if (onSuccess) onSuccess();
      
      // Close after showing message briefly
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error accepting offer:', err);
      setError(`Failed to accept offer: ${err.message}`);
    } finally {
      setAccepting(prev => ({ ...prev, [offerId]: false }));
    }
  };

  const handleRejectOffer = async (offerId) => {
    if (!confirm('Are you sure you want to reject this offer? The buyer will be refunded.')) return;
    
    try {
      setRejecting(prev => ({ ...prev, [offerId]: true }));
      setError('');
      setSuccessMessage('');
      
      const tx = await contract.rejectOffer(offerId);
      console.log('⏳ Rejecting offer...');
      
      await tx.wait();
      console.log('✅ Offer rejected, buyer refunded');
      
      setSuccessMessage('✅ Offer rejected. Buyer has been refunded their escrow.');
      
      // Reload offers to show updated status
      setTimeout(() => {
        loadOffers();
      }, 1500);
    } catch (err) {
      console.error('Error rejecting offer:', err);
      setError(`Failed to reject offer: ${err.message}`);
    } finally {
      setRejecting(prev => ({ ...prev, [offerId]: false }));
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      0: '⏳ Pending Review',
      1: '✅ Accepted',
      2: '❌ Rejected',
      3: '🎉 Trade Completed',
      4: '⚪ Cancelled'
    };
    return labels[status] || 'Unknown';
  };

  const getStatusColor = (status) => {
    const colors = {
      0: '#fbbf24', // Pending - Yellow
      1: '#10b981', // Accepted - Green
      2: '#ef4444', // Rejected - Red
      3: '#8b5cf6', // Completed - Purple
      4: '#6b7280'  // Cancelled - Gray
    };
    return colors[status] || '#6b7280';
  };
  
  const getStatusExplanation = (status) => {
    const explanations = {
      0: 'Waiting for seller to decrypt and review your offer',
      1: 'Seller accepted! Trade will complete automatically',
      2: 'Seller rejected this offer. Your escrow has been refunded',
      3: 'Trade completed successfully! Funds have been transferred',
      4: 'Offer was cancelled by buyer'
    };
    return explanations[status] || '';
  };

  const formatDate = (timestamp) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content view-offers-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📬 Offers for {listing.tokenSymbol}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="offers-container">
          {/* Listing Summary */}
          <div className="listing-summary">
            <div className="summary-row">
              <span className="summary-label">Token:</span>
              <span className="summary-value">{listing.tokenSymbol}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Deal Type:</span>
              <span className="summary-value">{listing.dealType === 4 ? 'PRIVATE SALE' : 'OTHER'}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Total Offers:</span>
              <span className="summary-value">{offers.length}</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
          
          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No Offers Yet</h3>
              <p>Waiting for buyers to make offers on your listing</p>
            </div>
          ) : (
            <div className="offers-list">
              {offers.map((offer) => (
                <div key={offer.id} className="offer-card">
                  <div className="offer-header">
                    <div className="offer-info">
                      <span className="offer-id">Offer #{offer.id}</span>
                      <div className="status-container">
                        <span 
                          className="offer-status" 
                          style={{ background: getStatusColor(offer.status) + '20', color: getStatusColor(offer.status) }}
                        >
                          {getStatusLabel(offer.status)}
                        </span>
                        <span className="status-explanation">
                          {getStatusExplanation(offer.status)}
                        </span>
                      </div>
                    </div>
                    <EthosScoreBadge address={offer.buyer} size="small" />
                  </div>

                  <div className="offer-details">
                    <div className="detail-row">
                      <span className="detail-label">Buyer:</span>
                      <span className="detail-value mono">{offer.buyer.slice(0, 6)}...{offer.buyer.slice(-4)}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Offer Type:</span>
                      <span className="detail-value">{offer.offerType}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Escrow Deposited:</span>
                      <span className="detail-value">{ethers.formatEther(offer.escrowAmount)} ETH</span>
                    </div>

                    {offer.customTerms && (
                      <div className="detail-row">
                        <span className="detail-label">Custom Terms:</span>
                        <span className="detail-value">{offer.customTerms}</span>
                      </div>
                    )}

                    <div className="detail-row">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">{formatDate(offer.createdAt)}</span>
                    </div>

                    {/* Note: Encrypted offer amount - accept based on escrow */}
                    <div className="offer-note">
                      💡 <strong>Review this offer based on:</strong> Buyer's Ethos score, Escrow deposited, and Offer type
                    </div>
                  </div>

                  {/* ACTIONS - Only for pending offers */}
                  {offer.status === 0 && (
                    <div className="offer-actions">
                      <button 
                        className="btn-reject"
                        onClick={() => handleRejectOffer(offer.id)}
                        disabled={rejecting[offer.id]}
                      >
                        {rejecting[offer.id] ? '⏳ Rejecting...' : '✕ Reject & Refund'}
                      </button>
                      <button 
                        className="btn-accept"
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={accepting[offer.id]}
                      >
                        {accepting[offer.id] ? '⏳ Accepting...' : '✓ Accept & Complete Trade'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewOffersModal;
