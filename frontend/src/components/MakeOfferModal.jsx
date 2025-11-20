import { ethers } from 'ethers';
import { useState } from 'react';
import { encryptValue } from '../utils/fhevmInstance';
import './MakeOfferModal.css';

// Offer type options
const OFFER_TYPES = [
  { value: 'FULL_TRANCHE', label: '📦 Full Tranche', desc: 'Buy entire tranche' },
  { value: 'PARTIAL', label: '⚖️ Partial', desc: 'Buy partial amount' },
  { value: 'CUSTOM', label: '✏️ Custom', desc: 'Custom negotiation' }
];

const MakeOfferModal = ({ listing, contract, fhevmInstance, account, onClose, onSuccess }) => {
  const [offerData, setOfferData] = useState({
    amount: '',
    escrow: '',
    // NEW: Web3 fields
    valuation: '',
    offerType: 'FULL_TRANCHE',
    customTerms: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setOfferData({
      ...offerData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent offering on own listing
    if (listing.seller.toLowerCase() === account.toLowerCase()) {
      setError('⚠️ You cannot make an offer on your own listing!');
      return;
    }
    
    if (!offerData.amount || !offerData.escrow || !offerData.valuation) {
      setError('Please fill in all required fields');
      return;
    }

    const amountValue = parseFloat(offerData.amount);
    const escrowValue = parseFloat(offerData.escrow);
    const valuationValue = parseFloat(offerData.valuation);

    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid offer amount');
      return;
    }

    if (isNaN(escrowValue) || escrowValue <= 0) {
      setError('Please enter a valid escrow amount');
      return;
    }

    if (isNaN(valuationValue) || valuationValue <= 0) {
      setError('Please enter a valid token valuation');
      return;
    }

    if (offerData.customTerms.length > 500) {
      setError('Custom terms must be 500 characters or less');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('🔐 Encrypting offer amount and valuation with FHE...');
      
      // Convert offer amount to wei and encrypt
      const amountInWei = Math.floor(amountValue * 1e6); // Use scaled value for encryption
      const valuationInWei = Math.floor(valuationValue * 1e6); // Use scaled value for encryption
      const contractAddress = contract.target || contract.address;
      
      // Encrypt the offer amount using FHE
      const { data: encryptedAmount, proof: amountProof } = await encryptValue(
        amountInWei, 
        contractAddress, 
        account
      );

      console.log('✅ Offer amount encrypted successfully');

      // Encrypt the valuation using FHE
      const { data: encryptedValuation, proof: valuationProof } = await encryptValue(
        valuationInWei, 
        contractAddress, 
        account
      );

      console.log('✅ Valuation encrypted successfully');
      console.log('📝 Submitting offer to blockchain...');

      // Convert escrow to wei
      const escrowInWei = ethers.parseEther(offerData.escrow);

      // Submit offer with encrypted values, Web3 fields, and escrow deposit
      const tx = await contract.makeOffer(
        listing.id,
        encryptedAmount,
        amountProof,
        encryptedValuation,
        valuationProof,
        offerData.offerType,
        offerData.customTerms,
        { value: escrowInWei }
      );

      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      
      console.log('✅ Offer submitted successfully!', receipt);
      onSuccess();
    } catch (err) {
      console.error('Error making offer:', err);
      
      // User-friendly error messages
      if (err.message?.includes('user rejected')) {
        setError('Transaction cancelled by user');
      } else if (err.message?.includes('insufficient funds')) {
        setError('Insufficient ETH for escrow deposit');
      } else if (err.message?.includes('Offer below minimum')) {
        setError('Your offer is below the minimum price');
      } else if (err.message?.includes('Cannot offer on own listing')) {
        setError('You cannot make an offer on your own listing');
      } else {
        setError(err.message || 'Failed to submit offer');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content offer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💼 Make Private Offer</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="offer-form">
          <div className="listing-preview">
            <div className="preview-header">
              <h3>📦 {listing.tokenSymbol || listing.title}</h3>
              <span className="category-badge">{listing.category}</span>
            </div>
            <p className="preview-desc">{listing.description}</p>
            <div className="preview-info">
              <span className="info-label">Seller:</span>
              <span className="info-value">{listing.seller.substring(0, 6)}...{listing.seller.substring(38)}</span>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="offerType">Offer Type *</label>
            <div className="offer-type-grid" role="group" aria-labelledby="offerType">
              {OFFER_TYPES.map(type => (
                <div
                  key={type.value}
                  className={`offer-type-option ${offerData.offerType === type.value ? 'selected' : ''}`}
                  onClick={() => setOfferData({ ...offerData, offerType: type.value })}
                >
                  <div className="option-label">{type.label}</div>
                  <div className="option-desc">{type.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Your Offer Amount (ETH) *</label>
            <input
              id="amount"
              type="number"
              name="amount"
              value={offerData.amount}
              onChange={handleChange}
              placeholder="e.g., 0.5"
              step="0.001"
              min="0"
              required
            />
            <div className="input-hint">🔒 Encrypted - only seller can see</div>
          </div>

          <div className="form-group">
            <label htmlFor="valuation">Desired Token Valuation (ETH) *</label>
            <input
              id="valuation"
              type="number"
              name="valuation"
              value={offerData.valuation}
              onChange={handleChange}
              placeholder="e.g., 0.001"
              step="0.0001"
              min="0"
              required
            />
            <div className="input-hint">🔒 Encrypted - your desired price per token</div>
          </div>

          <div className="form-group">
            <label htmlFor="customTerms">Custom Terms (Optional)</label>
            <textarea
              id="customTerms"
              name="customTerms"
              value={offerData.customTerms}
              onChange={handleChange}
              placeholder="Add any custom negotiation terms or conditions..."
              maxLength={500}
              rows={4}
            />
            <div className="input-hint">{offerData.customTerms.length}/500 characters</div>
          </div>

          <div className="form-group">
            <label htmlFor="escrow">Escrow Deposit (ETH) *</label>
            <input
              id="escrow"
              type="number"
              name="escrow"
              value={offerData.escrow}
              onChange={handleChange}
              placeholder="e.g., 0.1"
              step="0.01"
              min="0"
              required
            />
            <div className="input-hint">💰 Security deposit (refunded if rejected)</div>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? '⏳ Encrypting & Submitting...' : '💼 Submit Private Offer'}
            </button>
          </div>

          <div className="privacy-notice offer-notice">
            <div className="notice-icon">🔒</div>
            <div className="notice-text">
              <strong>FHE Privacy Protection:</strong>
              <ul>
                <li>✅ Your offer amount is encrypted on-chain</li>
                <li>✅ Only the seller can decrypt and view your offer</li>
                <li>✅ Other buyers cannot see your offer amount</li>
                <li>✅ Zero-knowledge proof ensures validity</li>
              </ul>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MakeOfferModal;
