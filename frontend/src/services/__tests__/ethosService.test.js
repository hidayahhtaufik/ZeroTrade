import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEthosScore } from '../ethosService';

// Mock global fetch
global.fetch = vi.fn();

describe('ethosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEthosScore', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';

    it('should return Exemplary level for score >= 2000', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { score: 2200, elements: [] } })
      });

      const result = await getEthosScore(mockAddress);

      expect(result.score).toBe(2200);
      expect(result.level.name).toBe('Exemplary');
      expect(result.level.color).toBe('#8b5cf6');
      expect(result.level.emoji).toBe('⭐');
      expect(result.hasScore).toBe(true);
    });

    it('should return Reputable level for score between 1600-1999', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { score: 1700, elements: [] } })
      });

      const result = await getEthosScore(mockAddress);

      expect(result.score).toBe(1700);
      expect(result.level.name).toBe('Reputable');
      expect(result.level.color).toBe('#10b981');
      expect(result.level.emoji).toBe('✅');
    });

    it('should return Neutral level for score between 1200-1599', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { score: 1400, elements: [] } })
      });

      const result = await getEthosScore(mockAddress);

      expect(result.score).toBe(1400);
      expect(result.level.name).toBe('Neutral');
      expect(result.level.color).toBe('#6b7280');
      expect(result.level.emoji).toBe('➖');
    });

    it('should return Questionable level for score between 800-1199', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { score: 1000, elements: [] } })
      });

      const result = await getEthosScore(mockAddress);

      expect(result.score).toBe(1000);
      expect(result.level.name).toBe('Questionable');
      expect(result.level.color).toBe('#f59e0b');
      expect(result.level.emoji).toBe('⚡');
    });

    it('should return Untrusted level for score < 800', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { score: 500, elements: [] } })
      });

      const result = await getEthosScore(mockAddress);

      expect(result.score).toBe(500);
      expect(result.level.name).toBe('Untrusted');
      expect(result.level.color).toBe('#ef4444');
      expect(result.level.emoji).toBe('⚠️');
    });

    it('should return default score for 404 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await getEthosScore(mockAddress);

      expect(result.score).toBe(1200);
      expect(result.level.name).toBe('Neutral');
      expect(result.hasScore).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await getEthosScore(mockAddress);

      expect(result.score).toBe(1200);
      expect(result.level.name).toBe('Neutral');
      expect(result.hasScore).toBe(false);
    });

    it('should handle missing score data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: false })
      });

      const result = await getEthosScore(mockAddress);

      expect(result.score).toBe(1200);
      expect(result.level.name).toBe('Neutral');
      expect(result.hasScore).toBe(false);
    });

    it('should return default score for null address', async () => {
      const result = await getEthosScore(null);
      expect(result.score).toBe(1200);
      expect(result.hasScore).toBe(false);
    });

    it('should call API with correct URL format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { score: 1500, elements: [] } })
      });

      await getEthosScore(mockAddress);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/score/address:${mockAddress}`)
      );
    });
  });
});
