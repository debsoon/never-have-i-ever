// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NeverHaveIEver is Ownable, ReentrancyGuard {
    // Price constants
    uint256 public constant INITIAL_PRICE_WEI = 630_000_000_000_000; // 0.00063 ETH = ~$1 at $1577.10/ETH
    uint256 public constant PRICE_DECIMALS = 18;
    uint256 public constant PROTOCOL_FEE_BASIS_POINTS = 2000; // 20% in basis points (2000/10000)
    
    struct Prompt {
        string content;
        address author;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 totalConfessions;
        uint256 totalPayout;
        uint256 totalReveals;
        bool isActive;
        bool hasActiveReveals; // Tracks if anyone has paid to reveal during active period
    }

    struct Confession {
        address user;
        bool hasRevealed;
    }

    mapping(uint256 => Prompt) public prompts;
    mapping(uint256 => mapping(address => Confession)) public confessions;
    mapping(address => uint256) public authorEarnings;
    uint256 public nextPromptId;
    uint256 public priceInWei;
    uint256 public protocolFeeBasisPoints; // Basis points (e.g., 2000 = 20%)

    event PromptCreated(uint256 indexed promptId, address indexed author, string content, uint256 expiresAt);
    event ConfessionRevealed(uint256 indexed promptId, address indexed user, uint256 amount);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event EarningsWithdrawn(address indexed author, uint256 amount);
    event PayoutDistributed(
        uint256 indexed promptId,
        address indexed author,
        uint256 authorAmount,
        uint256 protocolAmount
    );

    error PromptNotFound();
    error PromptExpired();
    error PromptNotActive();
    error AlreadyRevealed();
    error InsufficientPayment();
    error NoEarningsToWithdraw();
    error TransferFailed();
    error NoActiveReveals(); // New error for expired prompts without active reveals
    error InvalidProtocolFee();

    constructor() Ownable(msg.sender) {
        priceInWei = INITIAL_PRICE_WEI;
        protocolFeeBasisPoints = PROTOCOL_FEE_BASIS_POINTS;
    }

    function createPrompt(string memory content, uint256 durationInHours) external payable nonReentrant {
        if (msg.value < priceInWei) revert InsufficientPayment();

        uint256 promptId = nextPromptId++;
        uint256 expiresAt = block.timestamp + (durationInHours * 1 hours);

        prompts[promptId] = Prompt({
            content: content,
            author: msg.sender,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            totalConfessions: 0,
            totalPayout: 0,
            totalReveals: 0,
            isActive: true,
            hasActiveReveals: false
        });

        // 100% of creation fee goes to contract owner
        authorEarnings[owner()] += msg.value;

        emit PromptCreated(promptId, msg.sender, content, expiresAt);
        emit PayoutDistributed(promptId, owner(), msg.value, 0); // 100% to protocol
    }

    function payToReveal(uint256 promptId) external payable nonReentrant {
        Prompt storage prompt = prompts[promptId];
        if (prompt.author == address(0)) revert PromptNotFound();
        if (!prompt.isActive) revert PromptNotActive();
        if (confessions[promptId][msg.sender].hasRevealed) revert AlreadyRevealed();
        if (msg.value < priceInWei) revert InsufficientPayment();

        // Check if prompt is expired and has no active reveals
        if (block.timestamp > prompt.expiresAt && !prompt.hasActiveReveals) revert NoActiveReveals();

        confessions[promptId][msg.sender] = Confession({
            user: msg.sender,
            hasRevealed: true
        });

        prompt.totalPayout += msg.value;
        prompt.hasActiveReveals = true;
        prompt.totalReveals++;

        // Calculate and distribute earnings using configurable protocol fee
        uint256 protocolShare = (msg.value * protocolFeeBasisPoints) / 10000;
        uint256 authorShare = msg.value - protocolShare;

        // Send ETH directly to author and protocol
        (bool success1, ) = prompt.author.call{value: authorShare}("");
        if (!success1) revert TransferFailed();
        
        authorEarnings[owner()] += protocolShare;

        emit ConfessionRevealed(promptId, msg.sender, msg.value);
        emit PayoutDistributed(promptId, prompt.author, authorShare, protocolShare);
    }

    function withdrawEarnings() external nonReentrant {
        uint256 amount = authorEarnings[msg.sender];
        if (amount == 0) revert NoEarningsToWithdraw();

        authorEarnings[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit EarningsWithdrawn(msg.sender, amount);
    }

    function updatePrice(uint256 newPriceInWei) external onlyOwner {
        uint256 oldPrice = priceInWei;
        priceInWei = newPriceInWei;
        emit PriceUpdated(oldPrice, newPriceInWei);
    }

    function getPriceInEth() external view returns (uint256) {
        return priceInWei;
    }

    function getPriceInUsd(uint256 ethPriceInUsd) external view returns (uint256) {
        // Returns price in USD with 2 decimals (e.g., 100 = $1.00)
        return (priceInWei * ethPriceInUsd) / (10 ** PRICE_DECIMALS);
    }

    function getPrompt(uint256 promptId) external view returns (
        string memory content,
        address author,
        uint256 createdAt,
        uint256 expiresAt,
        uint256 totalConfessions,
        uint256 totalPayout,
        uint256 totalReveals,
        bool isActive
    ) {
        Prompt storage prompt = prompts[promptId];
        return (
            prompt.content,
            prompt.author,
            prompt.createdAt,
            prompt.expiresAt,
            prompt.totalConfessions,
            prompt.totalPayout,
            prompt.totalReveals,
            prompt.isActive
        );
    }

    function getConfession(uint256 promptId, address user) external view returns (bool hasRevealed) {
        Confession storage confession = confessions[promptId][user];
        return confession.hasRevealed;
    }

    function getAuthorEarnings(address author) external view returns (uint256) {
        return authorEarnings[author];
    }

    function updateProtocolFee(uint256 newProtocolFeeBasisPoints) external onlyOwner {
        if (newProtocolFeeBasisPoints > 10000) revert InvalidProtocolFee();
        protocolFeeBasisPoints = newProtocolFeeBasisPoints;
    }

    receive() external payable {
        revert("Direct ETH transfers not allowed");
    }
} 