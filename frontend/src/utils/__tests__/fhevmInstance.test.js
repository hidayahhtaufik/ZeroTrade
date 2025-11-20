import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  initializeFheInstance, 
  getFheInstance, 
  encryptValue, 
  decryptValue 
} from '../fhevmInstance';

describe('fhevmInstance utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementation
    global.window.ethereum = {
      request: vi.fn()
    };

    global.window.RelayerSDK = {
      initSDK: vi.fn().mockResolvedValue(undefined),
      createInstance: vi.fn().mockResolvedValue({
        createEncryptedInput: vi.fn().mockReturnValue({
          add64: vi.fn().mockReturnThis(),
          encrypt: vi.fn().mockResolvedValue({
            handles: ['0xencrypted'],
            inputProof: '0xproof'
          })
        }),
        publicDecrypt: vi.fn().mockResolvedValue(BigInt(1000)),
        getPublicKey: vi.fn().mockReturnValue('mock-public-key')
      }),
      SepoliaConfig: {
        network: 'sepolia',
        relayerUrl: 'https://relayer.testnet.zama.org'
      },
      generateKeypair: vi.fn().mockReturnValue({
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key'
      })
    };
  });

  describe('initializeFheInstance', () => {
    it('should initialize FHEVM successfully', async () => {
      const mockProvider = {
        send: vi.fn().mockResolvedValue('0xaa36a7')
      };

      await initializeFheInstance(mockProvider);

      expect(global.window.RelayerSDK.initSDK).toHaveBeenCalled();
      expect(global.window.RelayerSDK.createInstance).toHaveBeenCalled();
    });

    it('should throw error if no ethereum provider', async () => {
      const originalEthereum = global.window.ethereum;
      delete global.window.ethereum;

      await expect(initializeFheInstance()).rejects.toThrow(/Ethereum provider not found/);

      global.window.ethereum = originalEthereum;
    });

    it('should handle missing SDK', async () => {
      const originalSDK = global.window.RelayerSDK;
      global.window.RelayerSDK = undefined;

      const mockProvider = {
        send: vi.fn().mockResolvedValue('0xaa36a7')
      };

      await expect(initializeFheInstance(mockProvider)).rejects.toThrow(/RelayerSDK not loaded/);

      global.window.RelayerSDK = originalSDK;
    });

    it('should handle WASM loading errors', async () => {
      global.window.RelayerSDK.initSDK = vi.fn().mockRejectedValue(new Error('WASM error'));

      const mockProvider = {
        send: vi.fn().mockResolvedValue('0xaa36a7')
      };

      await expect(initializeFheInstance(mockProvider)).rejects.toThrow();
    });
  });

  describe('module exports', () => {
    it('should export required functions', () => {
      expect(typeof initializeFheInstance).toBe('function');
      expect(typeof getFheInstance).toBe('function');
      expect(typeof encryptValue).toBe('function');
      expect(typeof decryptValue).toBe('function');
    });

    it('should validate functions are callable', () => {
      expect(initializeFheInstance).toBeInstanceOf(Function);
      expect(getFheInstance).toBeInstanceOf(Function);
      expect(encryptValue).toBeInstanceOf(Function);
      expect(decryptValue).toBeInstanceOf(Function);
    });
  });
});
