import { ethers } from "ethers";

// Wallet state
let walletState = {
  isConnected: false,
  address: null,
  chainId: null,
};

// Event listeners
const listeners = {
  connect: [],
  disconnect: [],
  chainChanged: [],
  accountsChanged: [],
};

/**
 * Check if wallet is available
 */
export function isWalletAvailable() {
  return typeof window !== "undefined" && window.ethereum !== undefined;
}

/**
 * Register event listener
 */
export function onWalletEvent(event, callback) {
  if (listeners[event]) {
    listeners[event].push(callback);
  }
}

/**
 * Emit wallet event
 */
function emitWalletEvent(event, data) {
  if (listeners[event]) {
    listeners[event].forEach((callback) => callback(data));
  }
}

/**
 * Connect to wallet
 */
export async function connectWallet() {
  if (!isWalletAvailable()) {
    throw new Error("Ethereum wallet not found. Please install MetaMask.");
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (accounts.length === 0) {
      throw new Error("No accounts returned from wallet");
    }

    const address = accounts[0];

    // Get chain ID
    const chainIdHex = await window.ethereum.request({
      method: "eth_chainId",
    });
    const chainId = parseInt(chainIdHex, 16);

    // Update state
    walletState = {
      isConnected: true,
      address,
      chainId,
    };

    // Set up event listeners on first connection
    setupWalletListeners();

    emitWalletEvent("connect", walletState);

    return address;
  } catch (error) {
    if (error.code === -32002) {
      throw new Error("Request already pending. Please check your wallet.");
    }
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
}

/**
 * Disconnect wallet
 */
export function disconnectWallet() {
  walletState = {
    isConnected: false,
    address: null,
    chainId: null,
  };

  emitWalletEvent("disconnect", null);
}

/**
 * Setup wallet event listeners
 */
function setupWalletListeners() {
  if (!isWalletAvailable()) return;

  // Handle account changes
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      walletState.address = accounts[0];
      emitWalletEvent("accountsChanged", accounts[0]);
    }
  });

  // Handle chain changes
  window.ethereum.on("chainChanged", (chainIdHex) => {
    const chainId = parseInt(chainIdHex, 16);
    walletState.chainId = chainId;
    emitWalletEvent("chainChanged", chainId);
  });

  // Handle disconnection
  window.ethereum.on("disconnect", () => {
    disconnectWallet();
  });
}

/**
 * Get current wallet state
 */
export function getWalletState() {
  return { ...walletState };
}

/**
 * Check if connected to Sepolia testnet
 */
export function isSepoliaNetwork(chainId) {
  // Sepolia chain ID is 11155111
  return chainId === 11155111;
}

/**
 * Get signer from wallet
 */
export async function getSigner() {
  if (!isWalletAvailable()) {
    throw new Error("Ethereum wallet not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

/**
 * Get provider
 */
export function getProvider() {
  if (!isWalletAvailable()) {
    throw new Error("Ethereum wallet not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

// Initialize wallet listeners on page load
if (isWalletAvailable()) {
  setupWalletListeners();
}

export default {
  isWalletAvailable,
  connectWallet,
  disconnectWallet,
  getWalletState,
  getSigner,
  getProvider,
  isSepoliaNetwork,
  onWalletEvent,
};
