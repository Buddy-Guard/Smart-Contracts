// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Implements secure cross-chain interactions with a target contract using Chainlink CCIP.
 */
contract SourceContract is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IRouterClient private routerClient;
    LinkTokenInterface private linkToken;

    constructor(address _routerClientAddress, address _linkTokenAddress) {
        require(_routerClientAddress != address(0) && _linkTokenAddress != address(0), "Invalid address");
        routerClient = IRouterClient(_routerClientAddress);
        linkToken = LinkTokenInterface(_linkTokenAddress);
    }

    /**
     * Securely initiates a cross-chain request to create an order.
     */
    function initiateCreateOrder(
        uint64 destinationChainSelector,
        address targetContractAddress,
        address token,
        address[] calldata guardians,
        uint256 payment
    ) external nonReentrant {
        require(token != address(0) && targetContractAddress != address(0), "Invalid address");
        require(payment > 0, "Payment must be positive");

        // Transfer payment tokens to this contract for escrow
        IERC20(token).safeTransferFrom(msg.sender, address(this), payment);

        // Encode the cross-chain call data
        bytes memory data = abi.encodeWithSignature("createOrder(address,address[],uint256)", token, guardians, payment);

        // Construct token amounts array for CCIP message
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: token,
            amount: payment
        });

        // Sending the CCIP message
        routerClient.ccipSend(destinationChainSelector, Client.EVM2AnyMessage({
            receiver: abi.encode(targetContractAddress),
            data: data,
            tokenAmounts: tokenAmounts,
            extraArgs: "",
            feeToken: address(linkToken) // Assuming fees are paid in LINK
        }));
    }

    /**
     * Complete an order on the target chain. Simplified for demonstration.
     */
    function initiateCompleteOrder(
        uint64 destinationChainSelector,
        address targetContractAddress,
        uint256 orderId
    ) external nonReentrant {
        require(targetContractAddress != address(0), "Invalid address");

        // Encode the cross-chain call data
        bytes memory data = abi.encodeWithSignature("completeOrder(uint256)", orderId);

        // Sending the CCIP message without token amounts as it's a state change operation without direct token transfer
        routerClient.ccipSend(destinationChainSelector, Client.EVM2AnyMessage({
            receiver: abi.encode(targetContractAddress),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(linkToken) // Assuming fees are paid in LINK
        }));
    }

    /**
     * Allows the owner to withdraw LINK tokens (fees) accumulated by the contract.
     */
    function withdrawLinkTokens() external onlyOwner nonReentrant {
        uint256 balance = linkToken.balanceOf(address(this));
        require(balance > 0, "No LINK tokens to withdraw.");
        linkToken.transfer(owner(), balance);
    }

    /**
     * Allows the contract to receive ETH payments, which might be necessary for certain operations
     * or for paying gas fees if the contract itself initiates transactions.
     */
    receive() external payable {}

    /**
     * Withdraws accumulated Ether in the contract to the owner. This is useful if the contract
     * holds Ether, either from direct sends or as part of its functionality.
     */
    function withdrawEther() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No Ether to withdraw.");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Ether withdrawal failed.");
    }
}

