import React, { useState, useEffect } from "react";
import {
  connectWallet,
  disconnectWallet,
  getWalletState,
  isWalletAvailable,
  onWalletEvent,
} from "../utils/wallet";
import {
  requestTokens,
  getBalance,
  canClaim,
  getRemainingAllowance,
  getTimeUntilNextClaim,
  getFaucetConfig,
} from "../utils/contracts";
import "./App.css";

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState("0");
  const [canClaimNow, setCanClaimNow] = useState(false);
  const [remainingAllowance, setRemainingAllowance] = useState("0");
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [faucetAmount, setFaucetAmount] = useState("0");
  const [countdownInterval, setCountdownInterval] = useState(null);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);

  // Check if wallet is available
  useEffect(() => {
    if (!isWalletAvailable()) {
      setError("MetaMask or compatible wallet not found. Please install it.");
    }
  }, []);

  // Restore wallet connection on mount
  useEffect(() => {
    const restoreConnection = async () => {
      try {
        const state = getWalletState();
        if (state.isConnected && state.address) {
          setIsConnected(true);
          setAddress(state.address);
          await refreshData(state.address);
        }
      } catch (err) {
        console.error("Error restoring connection:", err);
      }
    };

    restoreConnection();
  }, []);

  // Set up wallet event listeners
  useEffect(() => {
    onWalletEvent("connect", (state) => {
      setIsConnected(state.isConnected);
      setAddress(state.address);
      setError("");
      refreshData(state.address);
    });

    onWalletEvent("disconnect", () => {
      setIsConnected(false);
      setAddress(null);
      setBalance("0");
      setCanClaimNow(false);
      setRemainingAllowance("0");
      setTimeUntilNextClaim(0);
      clearCountdown();
    });

    onWalletEvent("accountsChanged", (newAddress) => {
      setAddress(newAddress);
      refreshData(newAddress);
    });

    onWalletEvent("chainChanged", () => {
      setError("Network changed. Please refresh the page.");
    });
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (timeUntilNextClaim > 0 && isConnected) {
      const interval = setInterval(() => {
        setTimeUntilNextClaim((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            refreshData(address); // Refresh to show user can claim
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setCountdownInterval(interval);
      return () => clearInterval(interval);
    }
  }, [timeUntilNextClaim, isConnected, address]);

  function clearCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
  }

  async function refreshData(userAddress) {
    if (!userAddress) return;

    try {
      const [balanceVal, canClaimVal, remainingVal, timeVal, configVal] =
        await Promise.all([
          getBalance(userAddress),
          canClaim(userAddress),
          getRemainingAllowance(userAddress),
          getTimeUntilNextClaim(userAddress),
          getFaucetConfig(),
        ]);

      setBalance(balanceVal);
      setCanClaimNow(canClaimVal);
      setRemainingAllowance(remainingVal);
      setTimeUntilNextClaim(Number(timeVal));
      setIsPaused(configVal.isPaused);
      setFaucetAmount(configVal.faucetAmount);
      setError("");
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError(err.message || "Failed to load faucet data");
    }
  }

  async function handleConnect() {
    try {
      setLoading(true);
      setError("");
      const addr = await connectWallet();
      setIsConnected(true);
      setAddress(addr);
      setSuccess("Wallet connected successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    disconnectWallet();
    setIsConnected(false);
    setAddress(null);
  }

  async function handleRequestTokens() {
    if (!address) {
      setError("Please connect wallet first");
      return;
    }

    if (!canClaimNow) {
      setError("You are not eligible to claim yet");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const hash = await requestTokens();
      setTxHash(hash);
      setSuccess(`Tokens requested! Transaction: ${hash.substring(0, 10)}...`);

      // Refresh data after a short delay to let blockchain update
      setTimeout(() => {
        refreshData(address);
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to request tokens");
    } finally {
      setLoading(false);
    }
  }

  function formatAddress(addr) {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  function formatBalance(bal) {
    try {
      const num = BigInt(bal);
      const decimals = 18n;
      const divisor = 10n ** decimals;
      const whole = num / divisor;
      const remainder = (num % divisor).toString().padStart(18, "0");
      return `${whole}.${remainder.substring(0, 4)}`;
    } catch (e) {
      return "0";
    }
  }

  function formatTime(seconds) {
    if (seconds === 0) return "Ready to claim!";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🍰 FRC Token Faucet</h1>
        <p>Claim free FRC tokens every 24 hours</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert alert-success">
          {success}
          {txHash && (
            <>
              <br />
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View on Etherscan
              </a>
            </>
          )}
        </div>
      )}

      <main className="container">
        {/* Wallet Connection Section */}
        <section className="card wallet-section">
          <h2>Wallet Connection</h2>
          {!isWalletAvailable() ? (
            <div className="alert alert-error">
              MetaMask or compatible wallet not found. Please install MetaMask.
            </div>
          ) : isConnected ? (
            <div className="wallet-info">
              <div className="info-row">
                <span className="label">Connected Address:</span>
                <span className="value">{formatAddress(address)}</span>
              </div>
              <div className="info-row">
                <span className="label">Full Address:</span>
                <span className="value mono">{address}</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="btn btn-secondary"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </section>

        {isConnected && (
          <>
            {/* Token Status Section */}
            <section className="card status-section">
              <h2>Your Status</h2>

              <div className="status-grid">
                <div className="status-item">
                  <span className="label">Token Balance</span>
                  <span className="value">
                    {formatBalance(balance)} FRC
                  </span>
                </div>

                <div className="status-item">
                  <span className="label">Remaining Lifetime Allowance</span>
                  <span className="value">
                    {formatBalance(remainingAllowance)} FRC
                  </span>
                </div>

                <div className="status-item">
                  <span className="label">Faucet Status</span>
                  <span className={`value ${isPaused ? "paused" : "active"}`}>
                    {isPaused ? "⏸️ Paused" : "✅ Active"}
                  </span>
                </div>

                <div className="status-item">
                  <span className="label">Next Claim Available</span>
                  <span className={`value ${canClaimNow ? "ready" : ""}`}>
                    {formatTime(timeUntilNextClaim)}
                  </span>
                </div>
              </div>
            </section>

            {/* Claim Section */}
            <section className="card claim-section">
              <h2>Claim Tokens</h2>

              <div className="claim-info">
                <p>
                  Amount per claim:{" "}
                  <strong>{formatBalance(faucetAmount)} FRC</strong>
                </p>
                <p>Cooldown period: <strong>24 hours</strong></p>
                <p>Lifetime limit: <strong>100 FRC</strong></p>
              </div>

              {isPaused ? (
                <div className="alert alert-warning">
                  ⏸️ The faucet is currently paused. Please try again later.
                </div>
              ) : canClaimNow ? (
                <div className="alert alert-info">
                  ✅ You are eligible to claim tokens now!
                </div>
              ) : timeUntilNextClaim > 0 ? (
                <div className="alert alert-warning">
                  ⏳ You must wait {formatTime(timeUntilNextClaim)} before your
                  next claim.
                </div>
              ) : (
                <div className="alert alert-warning">
                  ❌ You have reached your lifetime claim limit.
                </div>
              )}

              <button
                onClick={handleRequestTokens}
                disabled={loading || !canClaimNow || isPaused}
                className={`btn ${canClaimNow ? "btn-primary" : "btn-disabled"}`}
              >
                {loading ? "Processing..." : "Request Tokens"}
              </button>
            </section>

            {/* Info Section */}
            <section className="card info-section">
              <h2>ℹ️ How it works</h2>
              <ul>
                <li>Connect your Ethereum wallet (MetaMask recommended)</li>
                <li>Click "Request Tokens" to claim tokens</li>
                <li>You can claim once every 24 hours</li>
                <li>Maximum 100 FRC per wallet address</li>
                <li>Each claim gives you {formatBalance(faucetAmount)} FRC</li>
                <li>Transactions are executed on Sepolia testnet</li>
              </ul>
            </section>
          </>
        )}

        {!isConnected && isWalletAvailable() && (
          <section className="card info-section">
            <h2>👋 Welcome!</h2>
            <p>
              Connect your Ethereum wallet to get started. This faucet
              distributes FRC tokens on the Sepolia testnet.
            </p>
            <p>
              <strong>Requirements:</strong>
            </p>
            <ul>
              <li>MetaMask or compatible Web3 wallet installed</li>
              <li>Connected to Sepolia testnet</li>
              <li>Some Sepolia ETH for gas fees (optional)</li>
            </ul>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>FRC Token Faucet © 2024 - Decentralized Token Distribution</p>
      </footer>
    </div>
  );
}
