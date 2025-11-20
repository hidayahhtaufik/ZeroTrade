import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.ethereum
global.window.ethereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  selectedAddress: '0x1234567890123456789012345678901234567890'
};

// Mock RelayerSDK
global.window.RelayerSDK = {
  initSDK: vi.fn().mockResolvedValue(undefined),
  createInstance: vi.fn().mockResolvedValue({
    createEncryptedInput: vi.fn(),
    publicDecrypt: vi.fn(),
    userDecrypt: vi.fn(),
    getPublicKey: vi.fn(),
    getPublicParams: vi.fn()
  }),
  SepoliaConfig: {
    network: 'sepolia',
    relayerUrl: 'https://relayer.testnet.zama.org'
  },
  generateKeypair: vi.fn().mockReturnValue({
    publicKey: 'mock-public-key',
    privateKey: 'mock-private-key'
  }),
  createEIP712: vi.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;
