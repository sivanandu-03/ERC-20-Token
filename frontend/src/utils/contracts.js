import { ethers } from "ethers";
import { getSigner, getProvider } from "./wallet";

// Contract ABIs
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

const FAUCET_ABI = [
  "function requestTokens() external",
  "function canClaim(address user) view returns (bool)",
  "function remainingAllowance(address user) view returns (uint256)",
  "function lastClaimAt(address user) view returns (uint256)",
  "function totalClaimed(address user) view returns (uint256)",
  "function isPaused() view returns (bool)",
  "function FAUCET_AMOUNT() view returns (uint256)",
  "function COOLDOWN_TIME() view returns (uint256)",
  "function MAX_CLAIM_AMOUNT() view returns (uint256)",
  "function getTimeUntilNextClaim(address user) view returns (uint256)",
  "event TokensClaimed(address indexed user, uint256 amount, uint256 timestamp)",
];

// Get contract addresses from environment
function getContractAddresses() {
  return {
    token: import.meta.env.VITE_TOKEN_ADDRESS,
    faucet: import.meta.env.VITE_FAUCET_ADDRESS,
  };
}

/**
 * Validate contract addresses
 */
function validateAddresses(addresses) {
  if (!addresses.token || !ethers.isAddress(addresses.token)) {
    throw new Error(
      "Invalid or missing TOKEN address. Check environment variables."
    );
  }
  if (!addresses.faucet || !ethers.isAddress(addresses.faucet)) {
    throw new Error(
      "Invalid or missing FAUCET address. Check environment variables."
    );
  }
}

/**
 * Get token contract instance
 */
export async function getTokenContract() {
  const addresses = getContractAddresses();
  validateAddresses(addresses);

  const provider = getProvider();
  return new ethers.Contract(addresses.token, ERC20_ABI, provider);
}

/**
 * Get faucet contract instance
 */
export async function getFaucetContract() {
  const addresses = getContractAddresses();
  validateAddresses(addresses);

  const provider = getProvider();
  return new ethers.Contract(addresses.faucet, FAUCET_ABI, provider);
}

/**
 * Get faucet contract with signer
 */
export async function getFaucetContractWithSigner() {
  const addresses = getContractAddresses();
  validateAddresses(addresses);

  const signer = await getSigner();
  return new ethers.Contract(addresses.faucet, FAUCET_ABI, signer);
}

/**
 * Get token contract with signer
 */
export async function getTokenContractWithSigner() {
  const addresses = getContractAddresses();
  validateAddresses(addresses);

  const signer = await getSigner();
  return new ethers.Contract(addresses.token, ERC20_ABI, signer);
}

/**
 * Get token balance for address
 */
export async function getBalance(address) {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid address");
    }

    const contract = await getTokenContract();
    const balance = await contract.balanceOf(address);
    return balance.toString();
  } catch (error) {
    console.error("Error getting balance:", error);
    throw new Error(`Failed to get balance: ${error.message}`);
  }
}

/**
 * Check if address can claim
 */
export async function canClaim(address) {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid address");
    }

    const contract = await getFaucetContract();
    return await contract.canClaim(address);
  } catch (error) {
    console.error("Error checking claim eligibility:", error);
    throw new Error(`Failed to check eligibility: ${error.message}`);
  }
}

/**
 * Get remaining allowance for address
 */
export async function getRemainingAllowance(address) {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid address");
    }

    const contract = await getFaucetContract();
    const allowance = await contract.remainingAllowance(address);
    return allowance.toString();
  } catch (error) {
    console.error("Error getting remaining allowance:", error);
    throw new Error(`Failed to get remaining allowance: ${error.message}`);
  }
}

/**
 * Request tokens from faucet
 */
export async function requestTokens() {
  try {
    const contract = await getFaucetContractWithSigner();
    const tx = await contract.requestTokens();
    
    // Wait for transaction
    const receipt = await tx.wait();
    
    if (!receipt || receipt.status === 0) {
      throw new Error("Transaction failed");
    }

    return receipt.transactionHash;
  } catch (error) {
    console.error("Error requesting tokens:", error);
    
    // Parse error message
    let errorMessage = error.message;
    if (error.reason) {
      errorMessage = error.reason;
    } else if (error.data && error.data.message) {
      errorMessage = error.data.message;
    }

    throw new Error(`Failed to request tokens: ${errorMessage}`);
  }
}

/**
 * Get time until next claim (in seconds)
 */
export async function getTimeUntilNextClaim(address) {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid address");
    }

    const contract = await getFaucetContract();
    const time = await contract.getTimeUntilNextClaim(address);
    return Number(time);
  } catch (error) {
    console.error("Error getting time until next claim:", error);
    throw new Error(`Failed to get cooldown time: ${error.message}`);
  }
}

/**
 * Get total claimed amount for address
 */
export async function getTotalClaimed(address) {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid address");
    }

    const contract = await getFaucetContract();
    const total = await contract.totalClaimed(address);
    return total.toString();
  } catch (error) {
    console.error("Error getting total claimed:", error);
    throw new Error(`Failed to get total claimed: ${error.message}`);
  }
}

/**
 * Get last claim timestamp for address
 */
export async function getLastClaimAt(address) {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid address");
    }

    const contract = await getFaucetContract();
    const timestamp = await contract.lastClaimAt(address);
    return Number(timestamp);
  } catch (error) {
    console.error("Error getting last claim timestamp:", error);
    throw new Error(`Failed to get last claim time: ${error.message}`);
  }
}

/**
 * Get faucet configuration
 */
export async function getFaucetConfig() {
  try {
    const contract = await getFaucetContract();

    const [faucetAmount, cooldown, maxClaim, isPaused] = await Promise.all([
      contract.FAUCET_AMOUNT(),
      contract.COOLDOWN_TIME(),
      contract.MAX_CLAIM_AMOUNT(),
      contract.isPaused(),
    ]);

    return {
      faucetAmount: faucetAmount.toString(),
      cooldown: Number(cooldown),
      maxClaim: maxClaim.toString(),
      isPaused,
    };
  } catch (error) {
    console.error("Error getting faucet config:", error);
    throw new Error(`Failed to get faucet configuration: ${error.message}`);
  }
}

/**
 * Listen to TokensClaimed events
 */
export async function listenToClaimEvents(callback) {
  try {
    const contract = await getFaucetContract();
    
    contract.on("TokensClaimed", (user, amount, timestamp, event) => {
      callback({
        user,
        amount: amount.toString(),
        timestamp: Number(timestamp),
        event,
      });
    });

    // Return unsubscribe function
    return () => {
      contract.off("TokensClaimed");
    };
  } catch (error) {
    console.error("Error listening to events:", error);
    throw new Error(`Failed to listen to events: ${error.message}`);
  }
}

export default {
  getTokenContract,
  getFaucetContract,
  getBalance,
  canClaim,
  getRemainingAllowance,
  requestTokens,
  getTimeUntilNextClaim,
  getTotalClaimed,
  getLastClaimAt,
  getFaucetConfig,
  listenToClaimEvents,
};
