import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { initializeFheInstance } from './utils/fhevmInstance';
import { CONTRACT_ABI, ListingStatus } from './utils/contractABI';
import CreateListing from './components/CreateListing';
import ListingCard from './components/ListingCard';
import UserCard from './components/UserCard';
import MakeOfferModal from './components/MakeOfferModal';
import ViewOffersModal from './components/ViewOffersModal';
import './App.css';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x_YOUR_CONTRACT_ADDRESS";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

function App() {
  // State management
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [fhevmInstance, setFhevmInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showViewOffersModal, setShowViewOffersModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'mine'
  
  // Listings data
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);

  useEffect(() => {
    // Check if wallet is already connected
    checkConnection();
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (contract && account) {
      loadListings();
    }
  }, [contract, account]);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          // Silently reconnect
          await connectWallet();
        }
      } catch (error) {
        console.log('Not connected');
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this dApp');
      return;
    }

    try {
      setLoading(true);
      setStatus({ type: 'info', message: '🔗 Connecting to wallet...' });

      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Check/switch network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== SEPOLIA_CHAIN_ID) {
        setStatus({ type: 'warning', message: '⚠️ Switching to Sepolia...' });
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            alert('Please add Sepolia network to your wallet manually');
          }
          throw switchError;
        }
      }

      setAccount(accounts[0]);
      setStatus({ type: 'success', message: '✅ Wallet connected!' });

      // Setup contract and FHE SDK in parallel
      setStatus({ type: 'info', message: '⚙️ Setting up...' });
      
      const [contractInstance, fheInstance] = await Promise.all([
        (async () => {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        })(),
        initializeFheInstance()
      ]);

      setContract(contractInstance);
      setFhevmInstance(fheInstance);

      setStatus({ type: 'success', message: '✅ Ready!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 2000);
    } catch (error) {
      console.error('Connection error:', error);
      setStatus({ 
        type: 'error', 
        message: `❌ ${error.message || 'Failed to connect wallet'}` 
      });
      
      // Keep error visible longer for FHE failures
      if (error.message?.includes('Zama') || error.message?.includes('FHE')) {
        setTimeout(() => setStatus({ type: '', message: '' }), 8000);
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setFhevmInstance(null);
    setListings([]);
    setMyListings([]);
    setStatus({ type: 'info', message: '👋 Wallet disconnected' });
    setTimeout(() => setStatus({ type: '', message: '' }), 3000);
  };

  const loadListings = async () => {
    if (!contract || !account) return;
    
    try {
      setLoadingListings(true);
      const nextId = await contract.nextListingId();
      const total = Number(nextId);

      const allListings = [];
      const userListings = [];

      for (let i = 0; i < total; i++) {
        try {
          const info = await contract.getListingInfo(i);
          
          const listing = {
            id: i,
            seller: info[0],
            title: info[1],
            description: info[2],
            category: info[3],
            imageUrl: info[4],
            // NEW: Web3 fields
            tokenSymbol: info[5],
            fdv: info[6],
            dealType: Number(info[7]),
            trancheSize: info[8],
            vestingMonths: Number(info[9]),
            status: Number(info[10]), // Convert to number: 0=Active, 1=Sold, 2=Cancelled
            createdAt: info[11],
            offersCount: Number(info[12]),
            isOwner: info[0].toLowerCase() === account.toLowerCase()
          };
          
          console.log(`Listing ${i} status:`, Number(info[10]), listing.status === 1 ? '(SOLD)' : listing.status === 0 ? '(ACTIVE)' : '(CANCELLED)');
          
          allListings.push(listing);
          
          if (listing.isOwner) {
            userListings.push(listing);
          }
        } catch (err) {
          console.log(`Listing ${i} error:`, err);
        }
      }

      // Sort by newest first
      allListings.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      userListings.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

      setListings(allListings);
      setMyListings(userListings);
      console.log(`✅ Loaded ${allListings.length} listings total`);
    } catch (error) {
      console.error('Error loading listings:', error);
      setStatus({ type: 'error', message: '❌ Failed to load listings' });
    } finally {
      setLoadingListings(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setStatus({ type: 'success', message: '🎉 Item listed successfully!' });
    setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    loadListings();
  };

  const handleMakeOffer = (listing) => {
    // Prevent making offers on sold listings
    if (listing.status === 1) {
      setStatus({ type: 'error', message: '❌ This item has already been sold!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      return;
    }
    
    setSelectedListing(listing);
    setShowOfferModal(true);
  };

  const handleViewListing = (listing) => {
    setSelectedListing(listing);
    
    // If it's user's own listing, show offers modal
    if (listing.isOwner) {
      setShowViewOffersModal(true);
    } else {
      // If listing is sold, show info message
      if (listing.status === 1) {
        setStatus({ type: 'error', message: '❌ This item has already been sold!' });
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
        return;
      }
      // If it's someone else's listing, show make offer modal
      setShowOfferModal(true);
    }
  };

  const handleOfferSuccess = () => {
    setShowOfferModal(false);
    setShowViewOffersModal(false);
    setSelectedListing(null);
    setStatus({ type: 'success', message: '🎉 Offer submitted successfully!' });
    setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    loadListings(); // Reload to update offer counts
  };
  
  const handleViewOffersSuccess = () => {
    setStatus({ type: 'success', message: '✅ Trade completed! Listing is now SOLD.' });
    setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    loadListings(); // Reload to show SOLD status for all users
  };
  
  const handleViewOffersClose = () => {
    setShowViewOffersModal(false);
    setSelectedListing(null);
  };

  const currentListings = activeTab === 'all' ? listings : myListings;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-gradient"></div>
        <div className="header-content">
          <div className="header-left">
            <h1>⚡ ZeroTrade</h1>
            <p className="header-subtitle">Zero-Knowledge OTC Marketplace</p>
          </div>
          
          <div className="header-right">
            <button 
              onClick={toggleTheme}
              className="btn-theme-toggle"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {account && (
              <button 
                onClick={() => {
                  if (!fhevmInstance) {
                    setStatus({ 
                      type: 'error', 
                      message: '❌ Cannot create listings: Zama FHE service is unavailable. Please try again later.' 
                    });
                    setTimeout(() => setStatus({ type: '', message: '' }), 6000);
                    return;
                  }
                  setShowCreateModal(true);
                }}
                className="btn-create"
                title={!fhevmInstance ? "FHE service required" : "Create a new listing"}
                style={!fhevmInstance ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                ➕ Sell Item
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Wallet Section */}
      <section className="wallet-section">
        {!account ? (
          <div className="wallet-connect-card">
            <div className="connect-header">
              <div className="connect-icon">⚡</div>
              <h2>Welcome to ZeroTrade</h2>
              <p>Zero-Knowledge OTC Market powered by Zama FHE & Ethos</p>
            </div>
            
            <div className="features-grid-compact">
              <div className="feature-item">
                <span className="feature-emoji">🔒</span>
                <span>Encrypted Prices</span>
              </div>
              <div className="feature-item">
                <span className="feature-emoji">⭐</span>
                <span>Ethos Scores</span>
              </div>
              <div className="feature-item">
                <span className="feature-emoji">💰</span>
                <span>Private Offers</span>
              </div>
              <div className="feature-item">
                <span className="feature-emoji">✅</span>
                <span>Secure Escrow</span>
              </div>
            </div>

            <button 
              onClick={connectWallet} 
              disabled={loading}
              className="btn-connect-wallet"
            >
              {loading ? '⏳ Connecting...' : '🔗 Connect Wallet'}
            </button>
          </div>
        ) : (
          <div className="profile-dashboard">
            <div className="profile-stats-container">
              <div className="profile-stat-card profile-main">
                <UserCard 
                  address={account} 
                  label="Your Account" 
                  size="medium"
                />
                <button onClick={disconnectWallet} className="btn-disconnect-compact">
                  Disconnect
                </button>
              </div>
              
              <div className="profile-stat-card">
                <div className="profile-stat-header">
                  <span className="profile-stat-icon">📊</span>
                  <span className="profile-stat-title">Trading Stats</span>
                </div>
                <div className="profile-stat-grid">
                  <div className="profile-stat-item">
                    <div className="profile-stat-value">{myListings.length}</div>
                    <div className="profile-stat-label">Total Sales</div>
                  </div>
                  <div className="profile-stat-item">
                    <div className="profile-stat-value">
                      {myListings.filter(l => l.offersCount > 0).length}
                    </div>
                    <div className="profile-stat-label">With Offers</div>
                  </div>
                </div>
              </div>
              
              <div className="profile-stat-card">
                <div className="profile-stat-header">
                  <span className="profile-stat-icon">💰</span>
                  <span className="profile-stat-title">Volume</span>
                </div>
                <div className="profile-stat-grid">
                  <div className="profile-stat-item">
                    <div className="profile-stat-value">
                      {myListings.reduce((sum, l) => sum + l.offersCount, 0)}
                    </div>
                    <div className="profile-stat-label">Total Offers</div>
                  </div>
                  <div className="profile-stat-item">
                    <div className="profile-stat-value">
                      {listings.filter(l => l.status === ListingStatus.Active).length}
                    </div>
                    <div className="profile-stat-label">Available</div>
                  </div>
                </div>
              </div>
              
              <div className="profile-stat-card">
                <div className="profile-stat-header">
                  <span className="profile-stat-icon">🔥</span>
                  <span className="profile-stat-title">Activity</span>
                </div>
                <div className="profile-stat-grid">
                  <div className="profile-stat-item">
                    <div className="profile-stat-value">
                      {myListings.filter(l => l.status === ListingStatus.Active).length}
                    </div>
                    <div className="profile-stat-label">Active Sales</div>
                  </div>
                  <div className="profile-stat-item">
                    <div className="profile-stat-value status-indicator">●</div>
                    <div className="profile-stat-label">Online</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Status Messages */}
      {status.message && (
        <div className={`alert alert-${status.type}`}>
          {status.message}
        </div>
      )}

      {/* Main Content */}
      {account && contract && fhevmInstance ? (
        <>
          {/* Stats Dashboard */}
          <section className="stats-section">
            <div className="stat-card">
              <div className="stat-icon">🛒</div>
              <div className="stat-info">
                <div className="stat-value">{listings.length}</div>
                <div className="stat-label">Available Items</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏷️</div>
              <div className="stat-info">
                <div className="stat-value">{myListings.length}</div>
                <div className="stat-label">Your Sales</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-info">
                <div className="stat-value">
                  {myListings.filter(l => l.status === 0).length}
                </div>
                <div className="stat-label">Active Sales</div>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="tabs-container">
            <button 
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              🛒 Browse Items ({listings.length})
            </button>
            <button 
              className={`tab ${activeTab === 'mine' ? 'active' : ''}`}
              onClick={() => setActiveTab('mine')}
            >
              💼 My Sales ({myListings.length})
            </button>
          </div>

          {/* Listings Grid */}
          <section className="listings-section">
            {loadingListings ? (
              <div className="loading-state">
                <div className="loading-spinner-large"></div>
                <p>Loading listings...</p>
              </div>
            ) : currentListings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No items available</h3>
                <p>
                  {activeTab === 'mine' 
                    ? 'List your first item to start selling!' 
                    : 'Be the first to sell something!'}
                </p>
                {activeTab === 'mine' && (
                  <button 
                    onClick={() => {
                      if (!fhevmInstance) {
                        setStatus({ 
                          type: 'error', 
                          message: '❌ Cannot create listings: Zama FHE service is unavailable. Please try again later.' 
                        });
                        setTimeout(() => setStatus({ type: '', message: '' }), 6000);
                        return;
                      }
                      setShowCreateModal(true);
                    }}
                    className="btn-create-empty"
                    title={!fhevmInstance ? "FHE service required" : "Create a new listing"}
                    style={!fhevmInstance ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                  >
                    ➕ Sell Item
                  </button>
                )}
              </div>
            ) : (
              <div className="listings-grid">
                {currentListings.map(listing => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onView={handleViewListing}
                    onMakeOffer={handleMakeOffer}
                    isOwner={listing.isOwner}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Modals */}
          {showCreateModal && (
            <CreateListing 
              contract={contract}
              fhevmInstance={fhevmInstance}
              account={account}
              onClose={() => setShowCreateModal(false)}
              onSuccess={handleCreateSuccess}
            />
          )}

          {showOfferModal && selectedListing && (
            <MakeOfferModal
              listing={selectedListing}
              contract={contract}
              fhevmInstance={fhevmInstance}
              account={account}
              onClose={() => {
                setShowOfferModal(false);
                setSelectedListing(null);
              }}
              onSuccess={handleOfferSuccess}
            />
          )}
          
          {/* View Offers Modal - For sellers to see and decrypt offers */}
          {showViewOffersModal && selectedListing && (
            <ViewOffersModal
              listing={selectedListing}
              contract={contract}
              account={account}
              onClose={handleViewOffersClose}
              onSuccess={handleViewOffersSuccess}
            />
          )}
        </>
      ) : (
        <div className="welcome-section">
          <div className="welcome-card">
            <h2>🎯 How It Works</h2>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">1</div>
                <h3>Connect Wallet</h3>
                <p>Use MetaMask on Sepolia testnet</p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3>Sell Items</h3>
                <p>List anything with encrypted prices</p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3>Buy Items</h3>
                <p>Make private encrypted offers</p>
              </div>
              <div className="step-card">
                <div className="step-number">4</div>
                <h3>Complete Trade</h3>
                <p>Accept offers and finalize deals</p>
              </div>
            </div>
          </div>

          <div className="features-section">
            <h2>✨ Features</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-large">🔐</div>
                <h3>Fully Private</h3>
                <p>All prices encrypted with FHE technology</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon-large">⭐</div>
                <h3>Ethos Credibility</h3>
                <p>See reputation scores before trading</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon-large">💼</div>
                <h3>Secure Escrow</h3>
                <p>Automatic fund protection during trades</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon-large">⚡</div>
                <h3>Fast & Simple</h3>
                <p>Easy-to-use interface, powerful features</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p><strong>ZeroTrade</strong> - Built with <strong>❤️</strong> by <strong>Auranode</strong></p>
        <p className="footer-note">Zero-Knowledge OTC Marketplace on Sepolia</p>
      </footer>
    </div>
  );
}

export default App;
