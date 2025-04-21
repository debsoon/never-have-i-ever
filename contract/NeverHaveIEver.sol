// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NeverHaveIEver is Ownable {
    IERC20 public immutable usdcToken;
    uint256 public promptCount;

    struct Prompt {
        address creator;
        uint256 expiresAt;
        uint256 totalContributions;
        bool hadFirstReveal;
    }

    mapping(uint256 => Prompt) public prompts;
    mapping(uint256 => mapping(address => bool)) public hasRevealed;

    event PromptCreated(uint256 indexed promptId, address indexed creator, uint256 expiresAt);
    event RevealPaid(uint256 indexed promptId, address indexed revealer, uint256 amount);

    constructor(address usdcAddress) Ownable(msg.sender) {
        usdcToken = IERC20(usdcAddress);
    }

    function createPrompt(uint256 durationInSeconds) external returns (uint256) {
        require(durationInSeconds > 0, "Duration must be positive");

        // Transfer 1 USDC directly from sender
        require(usdcToken.transferFrom(msg.sender, owner(), 1e6), "Payment failed");

        promptCount++;
        uint256 expiresAt = block.timestamp + durationInSeconds;

        prompts[promptCount] = Prompt({
            creator: msg.sender,
            expiresAt: expiresAt,
            totalContributions: 0,
            hadFirstReveal: false
        });

        emit PromptCreated(promptCount, msg.sender, expiresAt);
        return promptCount;
    }

    function payToReveal(uint256 promptId) external {
        require(promptId > 0 && promptId <= promptCount, "Invalid prompt");
        require(!hasRevealed[promptId][msg.sender], "Already revealed");

        Prompt storage prompt = prompts[promptId];
        require(
            block.timestamp <= prompt.expiresAt || prompt.hadFirstReveal,
            "Prompt expired with no reveals"
        );

        // Transfer 1 USDC directly from sender
        require(usdcToken.transferFrom(msg.sender, address(this), 1e6), "Payment failed");

        // Split payment: 80% to creator, 20% to contract owner
        uint256 creatorShare = 8e5; // 0.8 USDC
        require(usdcToken.transfer(prompt.creator, creatorShare), "Creator payment failed");
        require(usdcToken.transfer(owner(), 2e5), "Owner payment failed");

        prompt.totalContributions += 1e6;
        prompt.hadFirstReveal = true;
        hasRevealed[promptId][msg.sender] = true;

        emit RevealPaid(promptId, msg.sender, 1e6);
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner(), amount), "Rescue failed");
    }
}
