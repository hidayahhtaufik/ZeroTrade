import { ethers } from 'ethers';
import { useState } from 'react';
import { CATEGORIES } from '../utils/contractABI';
import { encryptValue } from '../utils/fhevmInstance';
import './CreateListing.css';

// Deal type options
const DEAL_TYPES = [
  { value: '0', label: '⚡ Spot - Immediate Delivery' },
  { value: '1', label: '📅 Vesting - Token Vesting Schedule' },
  { value: '2', label: '📜 SAFT - Simple Agreement for Future Tokens' },
  { value: '3', label: '🎯 Token Sale - Public/Private Sale' },
  { value: '4', label: '🤝 Private Sale - OTC Private Deal' }
];

const CreateListing = ({ contract, fhevmInstance, account, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'NFTs',
    imageUrl: '',
    price: '',
    // NEW: Web3 fields
    tokenSymbol: '',
    fdv: '',
    dealType: '0', // 0=SPOT by default
    trancheSize: '',
    vestingMonths: '0'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, GIF, etc.)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setFormData({
        ...formData,
        imageUrl: base64String
      });
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title || !formData.category || !formData.price || 
        !formData.tokenSymbol || !formData.fdv || !formData.trancheSize) {
      setError('Please fill in all required fields');
      return;
    }

    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price');
      return;
    }

    const fdvValue = parseFloat(formData.fdv);
    if (isNaN(fdvValue) || fdvValue <= 0) {
      setError('Please enter a valid FDV');
      return;
    }

    const trancheSizeValue = parseInt(formData.trancheSize);
    if (isNaN(trancheSizeValue) || trancheSizeValue <= 0) {
      setError('Please enter a valid tranche size');
      return;
    }

    const vestingMonthsValue = parseInt(formData.vestingMonths);
    if (formData.dealType === '1' && (isNaN(vestingMonthsValue) || vestingMonthsValue < 1 || vestingMonthsValue > 60)) {
      setError('Vesting months must be between 1 and 60');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('🔐 Encrypting price...');
      // Convert price to wei and encrypt
      const priceInWei = Math.floor(priceValue * 1e6); // Use scaled value for encryption
      const contractAddress = contract.target || contract.address;
      const { data: encryptedPrice, proof } = await encryptValue(priceInWei, contractAddress, account);

      console.log('📝 Listing item for sale with Web3 details...');
      
      // Convert FDV to Wei
      const fdvInWei = ethers.parseEther(formData.fdv);
      
      const tx = await contract.createListing(
        formData.title,
        formData.description,
        formData.category,
        formData.imageUrl,
        // Web3 fields
        formData.tokenSymbol,
        fdvInWei,
        parseInt(formData.dealType),
        parseInt(formData.trancheSize),
        parseInt(formData.vestingMonths),
        // FHE encrypted price
        encryptedPrice,
        proof
      );

      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      
      console.log('✅ Item listed for sale!', receipt);
      onSuccess();
    } catch (err) {
      console.error('Error listing item:', err);
      setError(err.message || 'Failed to list item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔐 Sell Your Item</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="create-listing-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Bored Ape #1234, ethereum.eth, 1000 $TOKEN"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your Web3 asset... (NFT traits, token utility, domain TLD, etc.)"
              rows="4"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tokenSymbol">Token Symbol *</label>
              <input
                id="tokenSymbol"
                type="text"
                name="tokenSymbol"
                value={formData.tokenSymbol}
                onChange={handleChange}
                placeholder="e.g., ETH, BTC, USDC"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fdv">Fully Diluted Valuation (ETH) *</label>
              <input
                id="fdv"
                type="number"
                name="fdv"
                value={formData.fdv}
                onChange={handleChange}
                placeholder="e.g., 1000000"
                step="0.01"
                min="0"
                required
              />
              <div className="input-hint">Total market cap if all tokens released</div>
            </div>

            <div className="form-group">
              <label htmlFor="trancheSize">Tranche Size (Number of Tokens) *</label>
              <input
                id="trancheSize"
                type="number"
                name="trancheSize"
                value={formData.trancheSize}
                onChange={handleChange}
                placeholder="e.g., 100000"
                min="1"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dealType">Deal Type *</label>
            <select
              id="dealType"
              name="dealType"
              value={formData.dealType}
              onChange={handleChange}
              required
            >
              {DEAL_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {formData.dealType === '1' && (
            <div className="form-group">
              <label htmlFor="vestingMonths">Vesting Duration (Months) *</label>
              <input
                id="vestingMonths"
                type="number"
                name="vestingMonths"
                value={formData.vestingMonths}
                onChange={handleChange}
                placeholder="e.g., 12"
                min="1"
                max="60"
                required
              />
              <div className="input-hint">1-60 months vesting period</div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="price">Minimum Price per Token (ETH) *</label>
            <input
              id="price"
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="0.001"
              step="0.0001"
              min="0"
              required
            />
            <div className="input-hint">🔒 This will be encrypted with FHE</div>
          </div>

          <div className="form-group">
            <label htmlFor="imageUpload">Upload Image</label>
            <input
              id="imageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input"
            />
            <div className="input-hint">📸 Max 2MB - JPG, PNG, GIF supported</div>
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button 
                  type="button"
                  className="btn-remove-image"
                  onClick={() => {
                    setImagePreview('');
                    setFormData({ ...formData, imageUrl: '' });
                  }}
                >
                  ✕ Remove
                </button>
              </div>
            )}
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
              {loading ? '⏳ Listing...' : '🛒 List for Sale'}
            </button>
          </div>

          <div className="privacy-notice">
            <div className="notice-icon">🔒</div>
            <div className="notice-text">
              <strong>Privacy Protected:</strong> Your price is encrypted using FHE.
              Only you and buyers can see the price when they make offers.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListing;
