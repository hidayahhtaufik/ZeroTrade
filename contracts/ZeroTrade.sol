// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, externalEuint64, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ZeroTrade - Zero-Knowledge OTC Marketplace
 * @notice Privacy-preserving OTC marketplace using Fully Homomorphic Encryption
 * @dev All prices and offers are encrypted, only authorized parties can decrypt
 * 
 * Key Features:
 * - Encrypted listing prices (competitors can't see your pricing)
 * - Private offers (offer amounts remain confidential)
 * - Web3-specific fields (token symbol, FDV, deal type, vesting)
 * - Automatic escrow system with encrypted amounts
 * - 1% platform fee (automatically transferred to owner)
 * - Ethos credibility integration (off-chain)
 * 
 * FHEVM v0.9 Compatible:
 * - Uses ZamaEthereumConfig for unified network configuration
 * - Self-relaying decryption (no Oracle dependency)
 * - publicDecrypt() for off-chain decryption
 */
contract ZeroTrade is ZamaEthereumConfig {
    
    // Platform fee: 1% of each successful trade (automatically transferred to owner)
    uint256 public constant PLATFORM_FEE_PERCENT = 1;
    uint256 public constant FEE_DENOMINATOR = 100;
    
    // Platform owner
    address public immutable platformOwner;
    
    // Status enums
    enum ListingStatus { Active, Sold, Cancelled }
    enum OfferStatus { Pending, Accepted, Rejected, Completed, Cancelled }
    enum DealType { SPOT, VESTING, SAFT, TOKEN_SALE, PRIVATE_SALE }
    
    // Listing structure with Web3 fields
    struct Listing {
        address seller;
        string title;
        string description;
        string category;
        string imageUrl;
        
        // Web3-specific fields
        string tokenSymbol;
        uint256 fdv;                // Fully Diluted Valuation (in Wei)
        DealType dealType;
        uint256 trancheSize;        // Number of tokens
        uint256 vestingMonths;      // 0 = no vesting, 1-60 = months
        
        euint64 encryptedPrice;
        ListingStatus status;
        uint256 createdAt;
        uint256 offersCount;
    }
    
    // Offer structure with Web3 fields
    struct Offer {
        uint256 listingId;
        address buyer;
        euint64 encryptedAmount;
        
        // Web3-specific fields
        euint64 encryptedValuation;  // Desired token valuation (encrypted)
        string offerType;            // "FULL_TRANCHE", "PARTIAL", "CUSTOM"
        string customTerms;          // Max 500 characters
        
        OfferStatus status;
        uint256 createdAt;
    }
    
    // Storage
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Offer) public offers;
    mapping(uint256 => uint256) public offerEscrow; // offerId => ETH amount
    mapping(uint256 => uint256[]) public listingOffers; // listingId => offerIds[]
    mapping(address => uint256[]) public userListings;  // user => listingIds[]
    mapping(address => uint256[]) public userOffers;    // user => offerIds[]
    
    uint256 public nextListingId;
    uint256 public nextOfferId;
    
    // Reentrancy guard
    bool private locked;
    modifier nonReentrant() {
        require(!locked, "Reentrancy detected");
        locked = true;
        _;
        locked = false;
    }
    
    // Events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        string title,
        string category,
        string tokenSymbol,
        DealType dealType,
        uint256 fdv,
        uint256 timestamp
    );

    event OfferCreated(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed buyer,
        string offerType,
        uint256 timestamp
    );
    
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event OfferMade(uint256 indexed offerId, uint256 indexed listingId, address indexed buyer);
    event OfferAccepted(uint256 indexed offerId, uint256 indexed listingId, address indexed seller);
    event OfferRejected(uint256 indexed offerId, uint256 indexed listingId);
    event OfferCancelled(uint256 indexed offerId, address indexed buyer);
    event TradeCompleted(uint256 indexed offerId, uint256 indexed listingId, address indexed seller, address buyer);
    event PlatformFeeCollected(uint256 indexed offerId, uint256 feeAmount);
    
    /**
     * @notice Constructor
     */
    constructor() {
        platformOwner = msg.sender;
    }
    
    /**
     * @notice Create a new listing with encrypted price and Web3 details
     */
    function createListing(
        string memory _title,
        string memory _description,
        string memory _category,
        string memory _imageUrl,
        // Web3 parameters
        string memory _tokenSymbol,
        uint256 _fdv,
        uint8 _dealType,
        uint256 _trancheSize,
        uint256 _vestingMonths,
        // FHE encrypted
        externalEuint64 _encryptedPrice,
        bytes calldata inputProof
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_tokenSymbol).length > 0, "Token symbol required");
        require(_fdv > 0, "FDV must be greater than 0");
        require(_trancheSize > 0, "Tranche size must be greater than 0");
        require(_vestingMonths <= 60, "Vesting too long (max 60 months)");
        require(_dealType <= uint8(DealType.PRIVATE_SALE), "Invalid deal type");

        // Convert external encrypted price to internal euint64
        euint64 encryptedPrice = FHE.fromExternal(_encryptedPrice, inputProof);

        uint256 listingId = nextListingId++;

        listings[listingId] = Listing({
            seller: msg.sender,
            title: _title,
            description: _description,
            category: _category,
            imageUrl: _imageUrl,
            tokenSymbol: _tokenSymbol,
            fdv: _fdv,
            dealType: DealType(_dealType),
            trancheSize: _trancheSize,
            vestingMonths: _vestingMonths,
            encryptedPrice: encryptedPrice,
            status: ListingStatus.Active,
            createdAt: block.timestamp,
            offersCount: 0
        });

        userListings[msg.sender].push(listingId);

        // Grant access to encrypted price
        FHE.allowThis(encryptedPrice);
        FHE.allow(encryptedPrice, msg.sender);

        emit ListingCreated(
            listingId,
            msg.sender,
            _title,
            _category,
            _tokenSymbol,
            DealType(_dealType),
            _fdv,
            block.timestamp
        );
        
        return listingId;
    }
    
    /**
     * @notice Make an encrypted offer on a listing with Web3 details
     */
    function makeOffer(
        uint256 _listingId,
        externalEuint64 _encryptedAmount,
        bytes calldata amountProof,
        // Web3 parameters
        externalEuint64 _encryptedValuation,
        bytes calldata valuationProof,
        string memory _offerType,
        string memory _customTerms
    ) external payable nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(msg.sender != listing.seller, "Cannot offer on own listing");
        require(bytes(_offerType).length > 0, "Offer type required");
        require(bytes(_customTerms).length <= 500, "Custom terms too long");

        // Convert external encrypted values to internal
        euint64 encryptedAmount = FHE.fromExternal(_encryptedAmount, amountProof);
        euint64 encryptedValuation = FHE.fromExternal(_encryptedValuation, valuationProof);

        // Note: Validation of offer amount vs listing price happens off-chain
        // Seller can decrypt both values and verify before accepting
        
        uint256 offerId = nextOfferId++;
        uint256 escrowAmount = msg.value;

        offers[offerId] = Offer({
            listingId: _listingId,
            buyer: msg.sender,
            encryptedAmount: encryptedAmount,
            encryptedValuation: encryptedValuation,
            offerType: _offerType,
            customTerms: _customTerms,
            status: OfferStatus.Pending,
            createdAt: block.timestamp
        });

        offerEscrow[offerId] = escrowAmount;
        listing.offersCount++;
        
        listingOffers[_listingId].push(offerId);
        userOffers[msg.sender].push(offerId);

        // Set up decryption permissions
        FHE.allowThis(encryptedAmount);
        FHE.allow(encryptedAmount, listing.seller);
        FHE.allow(encryptedAmount, msg.sender);
        
        FHE.allowThis(encryptedValuation);
        FHE.allow(encryptedValuation, listing.seller);
        FHE.allow(encryptedValuation, msg.sender);

        emit OfferCreated(
            offerId,
            _listingId,
            msg.sender,
            _offerType,
            block.timestamp
        );
        
        emit OfferMade(offerId, _listingId, msg.sender);
    }
    
    /**
     * @notice Seller accepts an offer
     */
    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        Listing storage listing = listings[offer.listingId];
        
        require(msg.sender == listing.seller, "Only seller can accept");
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(offer.status == OfferStatus.Pending, "Offer not pending");
        require(offerEscrow[offerId] > 0, "No ETH in escrow");
        
        // Update statuses
        offer.status = OfferStatus.Accepted;
        listing.status = ListingStatus.Sold;
        
        emit OfferAccepted(offerId, offer.listingId, msg.sender);
        
        // Auto-complete the trade
        _completeTrade(offerId);
    }
    
    /**
     * @notice Seller rejects an offer (buyer gets refund)
     */
    function rejectOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        Listing storage listing = listings[offer.listingId];
        
        require(msg.sender == listing.seller, "Only seller can reject");
        require(offer.status == OfferStatus.Pending, "Offer not pending");
        
        uint256 refundAmount = offerEscrow[offerId];
        require(refundAmount > 0, "No ETH to refund");
        
        // Update status before transfer
        offer.status = OfferStatus.Rejected;
        offerEscrow[offerId] = 0;
        
        // Refund buyer
        (bool success, ) = payable(offer.buyer).call{value: refundAmount}("");
        require(success, "Refund failed");
        
        emit OfferRejected(offerId, offer.listingId);
    }
    
    /**
     * @notice Buyer cancels their pending offer
     */
    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        
        require(msg.sender == offer.buyer, "Only buyer can cancel");
        require(offer.status == OfferStatus.Pending, "Offer not pending");
        
        uint256 refundAmount = offerEscrow[offerId];
        require(refundAmount > 0, "No ETH to refund");
        
        // Update status before transfer
        offer.status = OfferStatus.Cancelled;
        offerEscrow[offerId] = 0;
        
        // Refund buyer
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund failed");
        
        emit OfferCancelled(offerId, msg.sender);
    }
    
    /**
     * @notice Seller cancels their listing
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        
        require(msg.sender == listing.seller, "Only seller can cancel");
        require(listing.status == ListingStatus.Active, "Listing not active");
        
        listing.status = ListingStatus.Cancelled;
        
        emit ListingCancelled(listingId, msg.sender);
    }
    
    /**
     * @notice Internal function to complete trade
     * @dev Automatically transfers 1% platform fee to owner and 99% to seller
     */
    function _completeTrade(uint256 offerId) internal {
        Offer storage offer = offers[offerId];
        Listing storage listing = listings[offer.listingId];
        
        require(offer.status == OfferStatus.Accepted, "Offer not accepted");
        
        uint256 totalAmount = offerEscrow[offerId];
        require(totalAmount > 0, "No ETH to transfer");
        
        // Calculate platform fee (1%)
        uint256 platformFee = (totalAmount * PLATFORM_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 sellerAmount = totalAmount - platformFee;
        
        // Update status before transfers (reentrancy protection)
        offer.status = OfferStatus.Completed;
        offerEscrow[offerId] = 0;
        
        // DIRECT TRANSFER: Send seller amount (99%)
        (bool sellerSuccess, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(sellerSuccess, "Seller transfer failed");
        
        // DIRECT TRANSFER: Send platform fee (1%) automatically!
        if (platformFee > 0) {
            (bool feeSuccess, ) = payable(platformOwner).call{value: platformFee}("");
            require(feeSuccess, "Platform fee transfer failed");
            emit PlatformFeeCollected(offerId, platformFee);
        }
        
        emit TradeCompleted(offerId, offer.listingId, listing.seller, offer.buyer);
    }
    
    /**
     * @notice Get listing info with Web3 details
     */
    function getListingInfo(uint256 _listingId) external view returns (
        address seller,
        string memory title,
        string memory description,
        string memory category,
        string memory imageUrl,
        string memory tokenSymbol,
        uint256 fdv,
        uint8 dealType,
        uint256 trancheSize,
        uint256 vestingMonths,
        uint8 status,
        uint256 createdAt,
        uint256 offersCount
    ) {
        Listing storage listing = listings[_listingId];
        return (
            listing.seller,
            listing.title,
            listing.description,
            listing.category,
            listing.imageUrl,
            listing.tokenSymbol,
            listing.fdv,
            uint8(listing.dealType),
            listing.trancheSize,
            listing.vestingMonths,
            uint8(listing.status),
            listing.createdAt,
            listing.offersCount
        );
    }

    /**
     * @notice Get offer info with Web3 details
     */
    function getOfferInfo(uint256 _offerId) external view returns (
        uint256 listingId,
        address buyer,
        string memory offerType,
        string memory customTerms,
        uint8 status,
        uint256 createdAt,
        uint256 escrowAmount
    ) {
        Offer storage offer = offers[_offerId];
        return (
            offer.listingId,
            offer.buyer,
            offer.offerType,
            offer.customTerms,
            uint8(offer.status),
            offer.createdAt,
            offerEscrow[_offerId]
        );
    }
    
    /**
     * @notice Get encrypted price for a listing (only seller can view)
     */
    function getListingPrice(uint256 listingId) external view returns (euint64) {
        Listing storage listing = listings[listingId];
        require(msg.sender == listing.seller, "Only seller can view price");
        return listing.encryptedPrice;
    }
    
    /**
     * @notice Get encrypted offer amount (only buyer and seller can view)
     */
    function getOfferAmount(uint256 offerId) external view returns (euint64) {
        Offer storage offer = offers[offerId];
        Listing storage listing = listings[offer.listingId];
        require(
            msg.sender == offer.buyer || msg.sender == listing.seller,
            "Not authorized"
        );
        return offer.encryptedAmount;
    }
    
    /**
     * @notice Get all offers for a listing
     */
    function getListingOffers(uint256 listingId) external view returns (uint256[] memory) {
        return listingOffers[listingId];
    }
    
    /**
     * @notice Get all listings by a user
     */
    function getUserListings(address user) external view returns (uint256[] memory) {
        return userListings[user];
    }
    
    /**
     * @notice Get all offers by a user
     */
    function getUserOffers(address user) external view returns (uint256[] memory) {
        return userOffers[user];
    }
    
    /**
     * @notice Check if offer amount meets or exceeds listing price
     * @dev Returns encrypted boolean (not view because FHE operations modify state)
     */
    function isOfferAcceptable(uint256 offerId) public returns (ebool) {
        Offer storage offer = offers[offerId];
        Listing storage listing = listings[offer.listingId];
        
        require(
            msg.sender == listing.seller || msg.sender == offer.buyer,
            "Not authorized"
        );
        
        // Compare: offerAmount >= price
        return FHE.ge(offer.encryptedAmount, listing.encryptedPrice);
    }
    
    // ============================================
    // USER DECRYPTION FUNCTIONS (Private, Off-chain)
    // ============================================
    
    /**
     * @notice Get encrypted listing price handle for user decryption
     * @dev Seller can decrypt this off-chain using Zama Gateway relayer
     * @param listingId The listing ID
     * @return The encrypted price handle (euint64)
     * 
     * Usage Pattern (Frontend):
     * 1. Call this function to get encrypted handle
     * 2. Use fhevm.userDecrypt() with user's keypair to decrypt off-chain
     * 3. Display decrypted value in UI
     */
    function getEncryptedListingPrice(uint256 listingId) external view returns (euint64) {
        Listing storage listing = listings[listingId];
        require(msg.sender == listing.seller, "Only seller can access encrypted price");
        return listing.encryptedPrice;
    }
    
    /**
     * @notice Get encrypted offer amount and valuation for user decryption
     * @dev Seller can decrypt these off-chain to compare offers privately
     * @param offerId The offer ID
     * @return encryptedAmount The encrypted offer amount (euint64)
     * @return encryptedValuation The encrypted valuation (euint64)
     * 
     * Privacy: Only seller and buyer can decrypt. Other buyers remain blind.
     */
    function getEncryptedOfferDetails(uint256 offerId) external view returns (
        euint64 encryptedAmount,
        euint64 encryptedValuation
    ) {
        Offer storage offer = offers[offerId];
        Listing storage listing = listings[offer.listingId];
        
        require(
            msg.sender == listing.seller || msg.sender == offer.buyer,
            "Only seller or buyer can access encrypted offer"
        );
        
        return (offer.encryptedAmount, offer.encryptedValuation);
    }
    
    /**
     * @notice Batch get encrypted details for multiple offers
     * @dev Allows seller to decrypt multiple offers efficiently in one go
     * @param offerIds Array of offer IDs to retrieve
     * @return amounts Array of encrypted amounts
     * @return valuations Array of encrypted valuations
     */
    function getBatchEncryptedOffers(uint256[] calldata offerIds) external view returns (
        euint64[] memory amounts,
        euint64[] memory valuations
    ) {
        amounts = new euint64[](offerIds.length);
        valuations = new euint64[](offerIds.length);
        
        for (uint256 i = 0; i < offerIds.length; i++) {
            Offer storage offer = offers[offerIds[i]];
            Listing storage listing = listings[offer.listingId];
            
            require(
                msg.sender == listing.seller || msg.sender == offer.buyer,
                "Not authorized for all offers"
            );
            
            amounts[i] = offer.encryptedAmount;
            valuations[i] = offer.encryptedValuation;
        }
        
        return (amounts, valuations);
    }
    
    // ============================================
    // PUBLIC DECRYPTION FUNCTIONS (Transparent, On-chain Verified)
    // ============================================
    
    // Storage for publicly revealed trade prices
    mapping(uint256 => uint256) public revealedTradePrices;
    mapping(uint256 => bool) public isTradeRevealed;
    
    // Events for public decryption
    event TradeRevealRequested(uint256 indexed offerId, bytes32 indexed encryptedHandle);
    event TradePriceRevealed(uint256 indexed offerId, uint256 clearPrice);
    
    /**
     * @notice Request public decryption of a completed trade price
     * @dev Makes the encrypted offer amount publicly decryptable via Zama relayer
     * @param offerId The completed offer ID
     * 
     * Pattern (from Zama HighestDieRoll example):
     * 1. This function marks ciphertext as publicly decryptable
     * 2. Anyone calls Zama relayer to decrypt
     * 3. Anyone calls verifyAndRecordTradePrice() with proof
     * 4. Price becomes public on-chain
     * 
     * Use Case: Market transparency for price discovery
     */
    function requestPublicRevealTrade(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        require(offer.status == OfferStatus.Completed, "Trade not completed");
        require(!isTradeRevealed[offerId], "Trade already revealed");
        
        // Mark as publicly decryptable (Zama Gateway can now decrypt)
        FHE.makePubliclyDecryptable(offer.encryptedAmount);
        
        emit TradeRevealRequested(offerId, FHE.toBytes32(offer.encryptedAmount));
    }
    
    /**
     * @notice Verify and record publicly decrypted trade price
     * @dev Verifies the decryption proof and stores clear price on-chain
     * @param offerId The offer ID
     * @param clearPrice The decrypted price in wei (ABI-encoded)
     * @param decryptionProof The cryptographic proof from Zama relayer
     * 
     * Security: FHE.checkSignatures() ensures clearPrice is legitimate decryption
     * Pattern: From Zama's HighestDieRoll.sol example
     */
    function verifyAndRecordTradePrice(
        uint256 offerId,
        bytes memory clearPrice,
        bytes memory decryptionProof
    ) external {
        Offer storage offer = offers[offerId];
        require(offer.status == OfferStatus.Completed, "Trade not completed");
        require(!isTradeRevealed[offerId], "Already revealed");
        
        // Build ciphertext array for verification
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(offer.encryptedAmount);
        
        // Verify decryption proof (reverts if invalid)
        FHE.checkSignatures(cts, clearPrice, decryptionProof);
        
        // Decode and store public price
        uint256 decodedPrice = abi.decode(clearPrice, (uint256));
        revealedTradePrices[offerId] = decodedPrice;
        isTradeRevealed[offerId] = true;
        
        emit TradePriceRevealed(offerId, decodedPrice);
    }
    
    /**
     * @notice Get all revealed trade prices for market analysis
     * @param offerIds Array of offer IDs
     * @return prices Array of revealed prices (0 if not revealed)
     * @return revealed Array of booleans indicating if each trade is revealed
     */
    function getBatchRevealedPrices(uint256[] calldata offerIds) external view returns (
        uint256[] memory prices,
        bool[] memory revealed
    ) {
        prices = new uint256[](offerIds.length);
        revealed = new bool[](offerIds.length);
        
        for (uint256 i = 0; i < offerIds.length; i++) {
            prices[i] = revealedTradePrices[offerIds[i]];
            revealed[i] = isTradeRevealed[offerIds[i]];
        }
        
        return (prices, revealed);
    }
}
