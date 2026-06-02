import { connectWallet, getWalletState } from "./wallet";
import {
  getBalance,
  canClaim,
  getRemainingAllowance,
  requestTokens,
  getFaucetConfig,
} from "./contracts";

/**
 * Initialize evaluation interface on window
 */
export function initializeEvalInterface() {
  window.__EVAL__ = {
    /**
     * Connect wallet and return address
     */
    connectWallet: async () => {
      try {
        const address = await connectWallet();
        if (!address) {
          throw new Error("Failed to get address from wallet");
        }
        return address;
      } catch (error) {
        throw new Error(
          `connectWallet failed: ${error.message}`
        );
      }
    },

    /**
     * Request tokens and return transaction hash
     */
    requestTokens: async () => {
      try {
        const state = getWalletState();
        if (!state.isConnected) {
          throw new Error("Wallet not connected");
        }

        const txHash = await requestTokens();
        if (!txHash) {
          throw new Error("Failed to get transaction hash");
        }
        return txHash;
      } catch (error) {
        throw new Error(
          `requestTokens failed: ${error.message}`
        );
      }
    },

    /**
     * Get balance for address
     */
    getBalance: async (address) => {
      try {
        if (!address) {
          throw new Error("Address parameter required");
        }
        const balance = await getBalance(address);
        return balance;
      } catch (error) {
        throw new Error(
          `getBalance failed: ${error.message}`
        );
      }
    },

    /**
     * Check if address can claim
     */
    canClaim: async (address) => {
      try {
        if (!address) {
          throw new Error("Address parameter required");
        }
        return await canClaim(address);
      } catch (error) {
        throw new Error(
          `canClaim failed: ${error.message}`
        );
      }
    },

    /**
     * Get remaining allowance for address
     */
    getRemainingAllowance: async (address) => {
      try {
        if (!address) {
          throw new Error("Address parameter required");
        }
        const allowance = await getRemainingAllowance(address);
        return allowance;
      } catch (error) {
        throw new Error(
          `getRemainingAllowance failed: ${error.message}`
        );
      }
    },

    /**
     * Get contract addresses
     */
    getContractAddresses: async () => {
      try {
        const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS;
        const faucetAddress = import.meta.env.VITE_FAUCET_ADDRESS;

        if (!tokenAddress || !faucetAddress) {
          throw new Error("Contract addresses not configured");
        }

        return {
          token: tokenAddress,
          faucet: faucetAddress,
        };
      } catch (error) {
        throw new Error(
          `getContractAddresses failed: ${error.message}`
        );
      }
    },

    /**
     * Get current wallet address
     */
    getConnectedAddress: () => {
      const state = getWalletState();
      return state.address || null;
    },

    /**
     * Get faucet configuration
     */
    getFaucetConfig: async () => {
      try {
        const config = await getFaucetConfig();
        return {
          faucetAmount: config.faucetAmount,
          cooldown: config.cooldown,
          maxClaim: config.maxClaim,
          isPaused: config.isPaused,
        };
      } catch (error) {
        throw new Error(
          `getFaucetConfig failed: ${error.message}`
        );
      }
    },
  };

  console.log("✅ Evaluation interface initialized at window.__EVAL__");
}

export default { initializeEvalInterface };
