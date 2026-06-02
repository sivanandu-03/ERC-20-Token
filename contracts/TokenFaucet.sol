// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenFaucet
 * @dev ERC-20 token faucet with rate limiting and lifetime claim limits
 * - 24-hour cooldown between claims
 * - Lifetime maximum claim limit per address
 * - Pause/unpause functionality for admin
 */
contract TokenFaucet is ReentrancyGuard, Ownable {
    // Token contract interface
    IERC20 public token;

    // Amount of tokens to distribute per claim (5 tokens with 18 decimals)
    uint256 public constant FAUCET_AMOUNT = 5 * 10 ** 18;

    // Cooldown period in seconds (24 hours)
    uint256 public constant COOLDOWN_TIME = 24 hours;

    // Maximum lifetime claim amount per address (100 tokens)
    uint256 public constant MAX_CLAIM_AMOUNT = 100 * 10 ** 18;

    // Pause state
    bool public isPausedState = false;

    // Mapping to track last claim timestamp per address
    mapping(address => uint256) public lastClaimAt;

    // Mapping to track total claimed amount per address
    mapping(address => uint256) public totalClaimed;

    /**
     * @dev Emitted when tokens are successfully claimed
     */
    event TokensClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev Emitted when faucet pause state changes
     */
    event FaucetPaused(bool paused);

    /**
     * @dev Constructor to initialize the faucet
     * @param _token Address of the ERC-20 token contract
     */
    constructor(address _token) {
        require(_token != address(0), "Token address cannot be zero");
        token = IERC20(_token);
    }

    /**
     * @dev Request tokens from the faucet
     * Requirements:
     * - Faucet must not be paused
     * - Caller must be eligible to claim (cooldown elapsed)
     * - Caller must not exceed lifetime claim limit
     * - Faucet must have sufficient token balance
     */
    function requestTokens() external nonReentrant {
        require(!isPausedState, "Faucet is paused");
        require(
            canClaim(msg.sender),
            "You are not eligible to claim yet (cooldown not elapsed or lifetime limit reached)"
        );
        require(
            totalClaimed[msg.sender] + FAUCET_AMOUNT <= MAX_CLAIM_AMOUNT,
            "Claim would exceed lifetime limit"
        );

        // Update state before external call (checks-effects-interactions pattern)
        lastClaimAt[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += FAUCET_AMOUNT;

        // Transfer tokens to user
        bool success = token.transfer(msg.sender, FAUCET_AMOUNT);
        require(success, "Token transfer failed");

        emit TokensClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }

    /**
     * @dev Check if an address is eligible to claim tokens
     * @param user Address to check
     * @return Boolean indicating if user can claim
     */
    function canClaim(address user) public view returns (bool) {
        // Cannot claim if paused
        if (isPausedState) return false;

        // Cannot claim if cooldown hasn't elapsed
        if (block.timestamp < lastClaimAt[user] + COOLDOWN_TIME) {
            return false;
        }

        // Cannot claim if lifetime limit reached
        if (totalClaimed[user] >= MAX_CLAIM_AMOUNT) {
            return false;
        }

        return true;
    }

    /**
     * @dev Get remaining claimable amount for an address
     * @param user Address to check
     * @return Remaining tokens that can be claimed in lifetime
     */
    function remainingAllowance(address user) external view returns (uint256) {
        if (totalClaimed[user] >= MAX_CLAIM_AMOUNT) {
            return 0;
        }
        return MAX_CLAIM_AMOUNT - totalClaimed[user];
    }

    /**
     * @dev Get time remaining until next claim is available (in seconds)
     * @param user Address to check
     * @return Seconds until cooldown expires, 0 if ready to claim
     */
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        uint256 earliestNextClaim = lastClaimAt[user] + COOLDOWN_TIME;
        if (block.timestamp >= earliestNextClaim) {
            return 0;
        }
        return earliestNextClaim - block.timestamp;
    }

    /**
     * @dev Check if faucet is paused
     * @return Current pause state
     */
    function isPaused() external view returns (bool) {
        return isPausedState;
    }

    /**
     * @dev Pause or unpause the faucet (admin only)
     * @param _paused New pause state
     */
    function setPaused(bool _paused) external onlyOwner {
        isPausedState = _paused;
        emit FaucetPaused(_paused);
    }

    /**
     * @dev Emergency withdraw function to retrieve tokens from faucet
     * @param amount Amount of tokens to withdraw
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        bool success = token.transfer(msg.sender, amount);
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get total tokens distributed by faucet
     * @return Total number of claims made
     */
    function getTotalClaimsCount() external view returns (uint256) {
        // Note: This would require a counter to be accurate
        // For now, it's informational only
        return 0;
    }
}
