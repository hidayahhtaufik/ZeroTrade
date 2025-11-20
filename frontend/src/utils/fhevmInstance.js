/**
 * FHEVM Instance Manager - FHEVM v0.9 Compatible
 * 
 * UMD/SCRIPT TAG APPROACH (v0.3.0-5):
 * - SDK v0.3.0-5 loaded via <script> tag in index.html
 * - Available as window.RelayerSDK global
 * - Uses FHEVM v0.9 relayer endpoint (.org)
 * - No dynamic import issues, no bundler conflicts
 */

let fheInstance = null;

/**
 * Initialize FHEVM instance from window global (UMD)
 * Expects RelayerSDK v0.3.0-5 to be pre-loaded via script tag
 */
export async function initializeFheInstance() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Ethereum provider not found. Please install MetaMask or connect a wallet.');
  }

  try {
    console.log('🔐 Checking for Zama FHE SDK v0.3.0-5 (UMD)...');
    
    // Check for SDK loaded via script tag (both uppercase and lowercase)
    let sdk = window.RelayerSDK || window.relayerSDK;
    
    if (!sdk) {
      console.error('❌ window.RelayerSDK not found!');
      console.error('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('relay')));
      throw new Error(
        'RelayerSDK not loaded. Make sure index.html includes:\n' +
        '<script src="https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs"></script>'
      );
    }
    
    console.log('✅ SDK v0.3.0-5 loaded from window global');
    console.log('📦 SDK exports:', Object.keys(sdk));
    
    const { initSDK, createInstance, SepoliaConfig } = sdk;
    
    if (!initSDK || !createInstance || !SepoliaConfig) {
      console.error('❌ Missing exports!', { 
        hasInitSDK: !!initSDK, 
        hasCreateInstance: !!createInstance, 
        hasSepoliaConfig: !!SepoliaConfig 
      });
      throw new Error('SDK exports incomplete. Check SDK version.');
    }
    
    console.log('⚙️  Initializing SDK (loading WASM)...');
    
    // Initialize SDK (WASM auto-loaded from cdn.zama.org)
    try {
      await initSDK();
      console.log('✅ WASM loaded successfully');
    } catch (wasmError) {
      console.error('❌ WASM initialization failed:', wasmError);
      throw new Error('Failed to load WASM module. This may be a browser compatibility issue or network problem. Please try refreshing the page.');
    }
    
    // Check that we're connected to the right network
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('🔗 Connected to chain ID:', chainId);
      
      if (chainId !== '0xaa36a7') { // Sepolia = 11155111 = 0xaa36a7
        console.warn('⚠️  Not on Sepolia testnet. Current chain:', chainId);
      }
    } catch (chainError) {
      console.warn('⚠️  Could not verify chain ID:', chainError);
    }
    
    // Generate or retrieve user keypair
    const { generateKeypair } = sdk;
    let keypair;
    
    const storedKeypair = localStorage.getItem('fhevm_keypair');
    if (storedKeypair) {
      try {
        keypair = JSON.parse(storedKeypair);
        console.log('✅ Using stored keypair');
      } catch (e) {
        console.warn('Failed to parse stored keypair, generating new one');
        keypair = generateKeypair();
        localStorage.setItem('fhevm_keypair', JSON.stringify(keypair));
      }
    } else {
      console.log('🔑 Generating new keypair...');
      keypair = generateKeypair();
      localStorage.setItem('fhevm_keypair', JSON.stringify(keypair));
      console.log('✅ Keypair generated and stored');
    }
    
    // v0.3.0-5 has correct relayer URL built-in (.org not .cloud)
    // But we can still override to be explicit
    const config = {
      ...SepoliaConfig,
      network: window.ethereum,
      keypair: keypair, // Add keypair to config
      // v0.3.0-5 should already have this, but explicit is better
      relayerUrl: 'https://relayer.testnet.zama.org'
    };
    
    console.log('🏗️  Creating FHE instance with keypair...');
    console.log('📡 Relayer URL:', config.relayerUrl);
    
    try {
      fheInstance = await createInstance(config);
      console.log('✅ FHE Instance created successfully!');
      console.log('✅ FHEVM v0.9 ready! (SDK v0.3.0-5)');
    } catch (instanceError) {
      console.error('❌ Failed to create FHE instance:', instanceError);
      throw new Error('Failed to create FHE instance. Please ensure you are connected to Sepolia testnet and the Zama relayer service is available.');
    }
    
    return fheInstance;
  } catch (err) {
    console.error('❌ FHE initialization failed:', err);
    
    // User-friendly error messages
    if (err?.message?.includes('missing revert data') || err?.message?.includes('KMS')) {
      throw new Error('FHE system contracts on Sepolia are not responding. Zama service may be down.');
    }
    
    if (err?.message?.includes('network') || err?.message?.includes('chain')) {
      throw new Error('Network error. Make sure you are connected to Sepolia testnet (Chain ID: 11155111).');
    }
    
    if (err?.message?.includes('Failed to fetch') || err?.message?.includes('CDN')) {
      throw new Error('Cannot load Zama FHE SDK from CDN. Please check your internet connection.');
    }
    
    throw new Error('Failed to initialize FHE: ' + (err?.message || 'Unknown error'));
  }
}

export function getFheInstance() {
  if (!fheInstance) {
    throw new Error('FHE instance not initialized. Call initializeFheInstance() first.');
  }
  return fheInstance;
}

/**
 * Get or generate keypair for user decryption
 */
async function getUserKeypair() {
  const sdk = window.RelayerSDK || window.relayerSDK;
  const { generateKeypair } = sdk;
  
  // Try to get existing keypair from localStorage
  const stored = localStorage.getItem('fhevm_keypair');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse stored keypair, generating new one');
    }
  }
  
  // Generate new keypair
  console.log('🔑 Generating new keypair for user decryption...');
  const keypair = generateKeypair();
  
  // Store for future use
  localStorage.setItem('fhevm_keypair', JSON.stringify(keypair));
  console.log('✅ Keypair generated and stored');
  
  return keypair;
}

/**
 * Decrypt a single encrypted value using the Zama Gateway relayer
 * For FHEVM v0.9, the relayer handles decryption with proper ACL checks
 */
export async function decryptValue(encryptedBytes, contractAddress, userAddress) {
  const fhe = getFheInstance();
  
  try {
    // Validate input
    if (typeof encryptedBytes !== "string" || !encryptedBytes.startsWith("0x") || encryptedBytes.length !== 66) {
      throw new Error('Invalid ciphertext handle format. Expected 0x-prefixed 32-byte hex string.');
    }
    
    console.log('🔓 Decrypting value via Zama Gateway...');
    console.log('📋 Contract:', contractAddress);
    console.log('👤 User:', userAddress);
    console.log('🔐 Handle:', encryptedBytes);
    
    // Try publicDecrypt first - the relayer checks ACL permissions on-chain
    // If the user is granted permission via FHE.allow(), this will work
    try {
      console.log('🔓 Attempting decryption with ACL permission check...');
      const decryptedValues = await fhe.publicDecrypt([encryptedBytes]);
      
      console.log('✅ Decryption successful!');
      console.log('📊 Decrypted values:', decryptedValues);
      
      // Return decrypted value
      const value = decryptedValues[encryptedBytes];
      return Number(value);
    } catch (aclError) {
      console.error('❌ publicDecrypt failed:', aclError);
      
      // If it's a permission error, provide helpful message
      if (aclError?.message?.includes('not allowed')) {
        throw new Error('❌ You do not have permission to decrypt this value. The contract must grant you permission via FHE.allow()');
      }
      
      throw aclError;
    }
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error?.message?.includes('User rejected') || error?.code === 4001) {
      throw new Error('Signature rejected. You must sign to decrypt the offer amount.');
    }
    
    if (error?.message?.includes('not allowed') || error?.message?.includes('permission')) {
      throw new Error('❌ Decryption permission denied. Make sure you are the seller of this listing.');
    }
    
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
      throw new Error('Decryption service temporarily unavailable. Please try again later.');
    }
    
    throw error;
  }
}

/**
 * Encrypt a value for use in smart contract
 * Returns { data, proof } for contract submission
 */
export async function encryptValue(value, contractAddress, userAddress) {
  const fhe = getFheInstance();
  
  try {
    console.log('🔐 Encrypting value:', value);
    console.log('FHE instance type:', typeof fhe);
    console.log('Available methods:', Object.keys(fhe).filter(k => typeof fhe[k] === 'function').join(', '));
    
    // Try different possible method names based on Zama SDK versions
    let encrypted;
    
    if (typeof fhe.createEncryptedInput === 'function') {
      // SDK v0.3.0-5 with createEncryptedInput
      console.log('Using createEncryptedInput method (v0.3.0-5)');
      const input = fhe.createEncryptedInput(contractAddress, userAddress);
      input.add64(BigInt(value));
      encrypted = await input.encrypt();
      console.log('✅ Encrypted with createEncryptedInput:', encrypted);
      
      // v0.3.0-5 returns: { handles: [handle], inputProof: Uint8Array }
      // We need to normalize to { data, proof } for compatibility
      if (encrypted.handles && encrypted.inputProof) {
        console.log('📦 Normalizing v0.3.0-5 format: handles → data, inputProof → proof');
        return {
          data: encrypted.handles[0],  // First handle is the encrypted value
          proof: encrypted.inputProof   // Proof for verification
        };
      }
      
      // Fallback if format is different
      return encrypted;
    } else if (typeof fhe.encrypt_u64 === 'function') {
      // Older SDK version
      console.log('Using encrypt_u64 method');
      encrypted = await fhe.encrypt_u64(value);
      return encrypted;
    } else if (typeof fhe.encrypt64 === 'function') {
      console.log('Using encrypt64 method');
      encrypted = await fhe.encrypt64(value);
      return encrypted;
    } else {
      console.error('❌ No suitable encryption method found!');
      console.error('Available methods:', Object.keys(fhe).filter(k => typeof fhe[k] === 'function'));
      throw new Error('FHE encryption method not found. SDK version mismatch - please check Zama documentation.');
    }
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    console.error('Error details:', { message: error.message, stack: error.stack?.substring(0, 300) });
    throw new Error(`Failed to encrypt value: ${error.message}`);
  }
}
