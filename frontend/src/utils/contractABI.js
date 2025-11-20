/**
 * ZeroTrade - Zero-Knowledge OTC Marketplace
 * Contract ABI
 */
export const CONTRACT_ABI = [
  // Read Functions
  "function platformOwner() view returns (address)",
  "function PLATFORM_FEE_PERCENT() view returns (uint256)",
  "function nextListingId() view returns (uint256)",
  "function nextOfferId() view returns (uint256)",
  
  // Listing Functions (Updated with Web3 fields)
  "function createListing(string title, string description, string category, string imageUrl, string tokenSymbol, uint256 fdv, uint8 dealType, uint256 trancheSize, uint256 vestingMonths, bytes32 inPrice, bytes inputProof) returns (uint256)",
  "function cancelListing(uint256 listingId)",
  "function getListingInfo(uint256 listingId) view returns (address seller, string title, string description, string category, string imageUrl, string tokenSymbol, uint256 fdv, uint8 dealType, uint256 trancheSize, uint256 vestingMonths, uint8 status, uint256 createdAt, uint256 offersCount)",
  "function getListingPrice(uint256 listingId) view returns (bytes32)",
  "function getUserListings(address user) view returns (uint256[])",
  "function getListingOffers(uint256 listingId) view returns (uint256[])",
  
  // Offer Functions (Updated with Web3 fields)
  "function makeOffer(uint256 listingId, bytes32 encryptedAmount, bytes amountProof, bytes32 encryptedValuation, bytes valuationProof, string offerType, string customTerms) payable returns (uint256)",
  "function acceptOffer(uint256 offerId)",
  "function rejectOffer(uint256 offerId)",
  "function cancelOffer(uint256 offerId)",
  "function getOfferInfo(uint256 offerId) view returns (uint256 listingId, address buyer, string offerType, string customTerms, uint8 status, uint256 createdAt)",
  "function getOfferAmount(uint256 offerId) view returns (bytes32)",
  "function getUserOffers(address user) view returns (uint256[])",
  "function isOfferAcceptable(uint256 offerId) returns (bytes32)",
  
  // Events (Updated with Web3 fields)
  "event ListingCreated(uint256 indexed listingId, address indexed seller, string title, string category, string tokenSymbol, uint8 dealType, uint256 fdv, uint256 timestamp)",
  "event OfferCreated(uint256 indexed offerId, uint256 indexed listingId, address indexed buyer, string offerType, uint256 timestamp)",
  "event ListingCancelled(uint256 indexed listingId, address indexed seller)",
  "event OfferMade(uint256 indexed offerId, uint256 indexed listingId, address indexed buyer)",
  "event OfferAccepted(uint256 indexed offerId, uint256 indexed listingId, address indexed seller)",
  "event OfferRejected(uint256 indexed offerId, uint256 indexed listingId)",
  "event OfferCancelled(uint256 indexed offerId, address indexed buyer)",
  "event TradeCompleted(uint256 indexed offerId, uint256 indexed listingId, address indexed seller, address buyer)",
  "event PlatformFeeCollected(uint256 indexed offerId, uint256 feeAmount)"
];

// Listing Status Enum
export const ListingStatus = {
  Active: 0,
  Sold: 1,
  Cancelled: 2
};

// Offer Status Enum
export const OfferStatus = {
  Pending: 0,
  Accepted: 1,
  Rejected: 2,
  Completed: 4,
  Cancelled: 5
};

// Web3 Category Options
export const CATEGORIES = [
  'NFTs',
  'Tokens',
  'Domain Names',
  'Gaming Assets',
  'DeFi Products',
  'Metaverse Items',
  'Digital Art',
  'DAO Memberships',
  'Virtual Land',
  'Web3 Services',
  'Crypto Hardware',
  'Other Web3'
];
