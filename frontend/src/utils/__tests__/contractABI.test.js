import { describe, it, expect } from 'vitest';
import { CONTRACT_ABI, ListingStatus, OfferStatus, CATEGORIES } from '../contractABI';

describe('contractABI', () => {
  describe('CONTRACT_ABI', () => {
    it('should be an array', () => {
      expect(Array.isArray(CONTRACT_ABI)).toBe(true);
    });

    it('should contain function signatures', () => {
      const functionSignatures = CONTRACT_ABI.filter(item => item.includes('function'));
      
      expect(functionSignatures.length).toBeGreaterThan(0);
    });

    it('should contain createListing function', () => {
      const hasCreateListing = CONTRACT_ABI.some(item => item.includes('createListing'));
      expect(hasCreateListing).toBe(true);
    });

    it('should contain makeOffer function', () => {
      const hasMakeOffer = CONTRACT_ABI.some(item => item.includes('makeOffer'));
      expect(hasMakeOffer).toBe(true);
    });

    it('should contain acceptOffer function', () => {
      const hasAcceptOffer = CONTRACT_ABI.some(item => item.includes('acceptOffer'));
      expect(hasAcceptOffer).toBe(true);
    });

    it('should contain rejectOffer function', () => {
      const hasRejectOffer = CONTRACT_ABI.some(item => item.includes('rejectOffer'));
      expect(hasRejectOffer).toBe(true);
    });

    it('should contain event definitions', () => {
      const eventSignatures = CONTRACT_ABI.filter(item => item.includes('event'));
      
      expect(eventSignatures.length).toBeGreaterThan(0);
      expect(eventSignatures.some(item => item.includes('ListingCreated'))).toBe(true);
      expect(eventSignatures.some(item => item.includes('OfferCreated'))).toBe(true);
      expect(eventSignatures.some(item => item.includes('TradeCompleted'))).toBe(true);
    });
  });

  describe('ListingStatus', () => {
    it('should define correct status values', () => {
      expect(ListingStatus.Active).toBe(0);
      expect(ListingStatus.Sold).toBe(1);
      expect(ListingStatus.Cancelled).toBe(2);
    });
  });

  describe('OfferStatus', () => {
    it('should define correct status values', () => {
      expect(OfferStatus.Pending).toBe(0);
      expect(OfferStatus.Accepted).toBe(1);
      expect(OfferStatus.Rejected).toBe(2);
      expect(OfferStatus.Completed).toBe(4);
      expect(OfferStatus.Cancelled).toBe(5);
    });
  });

  describe('CATEGORIES', () => {
    it('should be an array of categories', () => {
      expect(Array.isArray(CATEGORIES)).toBe(true);
      expect(CATEGORIES.length).toBeGreaterThan(0);
    });

    it('should contain common Web3 categories', () => {
      expect(CATEGORIES).toContain('NFTs');
      expect(CATEGORIES).toContain('Tokens');
      expect(CATEGORIES).toContain('DeFi Products');
    });
  });
});
