// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FRCToken
 * @dev ERC-20 token with fixed maximum supply, mintable by authorized faucet only
 */
contract FRCToken is ERC20, Ownable {
    // Maximum supply: 1 million tokens with 18 decimals
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10 ** 18;
    
    // Address authorized to mint tokens (faucet contract)
    address public minter;

    /**
     * @dev Emitted when minter is changed
     */
    event MinterChanged(address indexed oldMinter, address indexed newMinter);

    /**
     * @dev Constructor to initialize the token
     * @param _minter Initial minter address (typically the faucet contract)
     */
    constructor(address _minter) ERC20("FRC Token", "FRC") {
        require(_minter != address(0), "Minter cannot be zero address");
        minter = _minter;
        emit MinterChanged(address(0), _minter);
    }

    /**
     * @dev Mint tokens to specified address
     * @param to Recipient address
     * @param amount Amount of tokens to mint (in base units)
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Only minter can mint tokens");
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Minting would exceed max supply");
        _mint(to, amount);
    }

    /**
     * @dev Change the minter address (only owner/admin can call)
     * @param newMinter New minter address
     */
    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "New minter cannot be zero address");
        address oldMinter = minter;
        minter = newMinter;
        emit MinterChanged(oldMinter, newMinter);
    }

    /**
     * @dev Retrieve current minter address
     */
    function getMinter() external view returns (address) {
        return minter;
    }
}
