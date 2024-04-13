// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract buddyGuard is Ownable, ReentrancyGuard {
    IERC20 public paymentToken;

    uint256 public expirationDuration;
    mapping(address => uint256) public guardianPricing;
    mapping(uint256 => mapping(address => uint256)) public guardianPayments; // Records payments to guardians
    uint256 public platformFee = 500; // 5% fee, in basis points, least support amount for USDC/USDT will be 10e4 / 10e6 = 0.01
    uint256 public orderCount;
    mapping(uint256 => Order) public orders;
    
    struct Order {
        address creator;
        address[] guardians;
        uint256 creationTime;
        bool isActive;
        uint256 totalPayment;
    }

    event OrderCreated(uint256 indexed orderId, address indexed creator, uint256 totalPayment);
    event GuardianAdded(uint256 indexed orderId, address indexed guardian, uint256 payment);
    event GuardianRemoved(uint256 indexed orderId, address indexed guardian);
    event PlatformFeeUpdated(uint256 newFee);
    event GuardianPricingUpdated(address indexed guardian, uint256 newPricing);
    event PaymentTokenUpdated(address newPaymentToken);
    event OrderCompleted(uint256 indexed orderId);
    event OrderExpired(uint256 indexed orderId, address indexed guardian);
    event PaymentDistributed(uint256 indexed orderId, address indexed guardian, uint256 amount);

    constructor(address _paymentToken, uint256 _initialExpirationDuration) {
        require(_paymentToken != address(0), "Invalid token address");
        paymentToken = IERC20(_paymentToken);
        expirationDuration = _initialExpirationDuration; // Set the initial expiration duration
    }

    function setPaymentToken(address _newPaymentToken) external onlyOwner {
        require(_newPaymentToken != address(0), "Invalid token address");
        paymentToken = IERC20(_newPaymentToken);
        emit PaymentTokenUpdated(_newPaymentToken);
    }

    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 10000, "Fee too high");
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }

    // Add a function to update the expiration duration
    function setExpirationDuration(uint256 _newDuration) external onlyOwner {
        expirationDuration = _newDuration;
    }

    function setGuardianPricing(uint256 _price) external {
        guardianPricing[msg.sender] = _price;
        emit GuardianPricingUpdated(msg.sender, _price);
    }

    function setGuardiansPricing(address[] calldata _guardians, uint256[] calldata _prices) external onlyOwner {
        require(_guardians.length == _prices.length, "Guardians and prices length mismatch");

        for (uint256 i = 0; i < _guardians.length; i++) {
            guardianPricing[_guardians[i]] = _prices[i];
            emit GuardianPricingUpdated(_guardians[i], _prices[i]);
        }
    }

    function createOrderWithPermit(
        address[] calldata _guardians,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        // Permit logic to approve tokens for this contract
        IERC20Permit(address(paymentToken)).permit(
            msg.sender,
            address(this),
            calculateTotalPrice(_guardians),
            _deadline,
            _v,
            _r,
            _s
        );

        // Directly call createOrder
        createOrder(_guardians);
    }

    // External function to change guardians
    function changeGuardians(
        uint256 _orderId, 
        address[] calldata _guardiansToAdd, 
        address[] calldata _guardiansToRemove
    ) external nonReentrant {
        require(orders[_orderId].creator == msg.sender, "Only order creator can change guardians");
        require(orders[_orderId].isActive, "Order is not active");

        uint256 totalPrice = calculateTotalPrice(_guardiansToAdd);
        uint256 totalRefund = calculateTotalPrice(_guardiansToRemove);

        // Transfer tokens to this contract
        if (totalPrice > totalRefund) {
            require(paymentToken.transferFrom(msg.sender, address(this), totalPrice - totalRefund), "Payment transfer failed");
        } else if (totalRefund > totalPrice) {
            require(paymentToken.transfer(msg.sender, totalRefund - totalPrice), "Refund transfer failed");
        }

        // Add guardians
        for (uint256 i = 0; i < _guardiansToAdd.length; i++) {
            _addGuardian(_orderId, _guardiansToAdd[i]);
        }

        // Remove guardians
        for (uint256 i = 0; i < _guardiansToRemove.length; i++) {
            _removeGuardian(_orderId, _guardiansToRemove[i]);
        }
    }

    // Complete an order and distribute tokens
    function completeOrder(uint256 _orderId) external nonReentrant {
        require(orders[_orderId].creator == msg.sender, "Only order creator can complete order");

        distributePayments(_orderId);
        emit OrderCompleted(_orderId);
    }

    // Trigger expired order and distribute tokens
    function trigExpiredOrder(uint256 _orderId) external nonReentrant {
        Order storage order = orders[_orderId];
        require(isGuardian(order, msg.sender), "Only assigned guardian can trigger");
        require(block.timestamp > orders[_orderId].creationTime + expirationDuration, "Order duration not yet expired");

        distributePayments(_orderId);
        emit OrderExpired(_orderId, msg.sender);
    }

    function withdrawEth() external onlyOwner nonReentrant {
        payable(owner()).transfer(address(this).balance);
    }

    function withdrawToken(uint256 _amount) external onlyOwner nonReentrant {
        require(paymentToken.transfer(owner(), _amount), "Withdrawal failed");
    }

    // Create an order with initial guardians
    function createOrder(address[] memory _guardians) public nonReentrant {
        uint256 totalPrice = calculateTotalPrice(_guardians);

        // Transfer tokens to this contract
        if (totalPrice > 0) {
            require(paymentToken.transferFrom(msg.sender, address(this), totalPrice), "Payment transfer failed");
        }

        Order storage order = orders[orderCount];
        order.creator = msg.sender;
        order.creationTime = block.timestamp;
        order.isActive = true;
        order.totalPayment = totalPrice;

        for (uint256 i = 0; i < _guardians.length; i++) {
            order.guardians.push(_guardians[i]);
            guardianPayments[orderCount][_guardians[i]] = guardianPricing[_guardians[i]];
            emit GuardianAdded(orderCount, _guardians[i], guardianPricing[_guardians[i]]);
        }

        emit OrderCreated(orderCount, msg.sender, totalPrice);
        orderCount++;
    }

    // Internal function to add a guardian with specific payment
    function _addGuardian(uint256 _orderId, address _guardian) internal {
        Order storage order = orders[_orderId];

        // Ensure the guardian is not already added
        for (uint256 i = 0; i < order.guardians.length; i++) {
            require(order.guardians[i] != _guardian, "Guardian already added");
        }

        order.guardians.push(_guardian);
        guardianPayments[_orderId][_guardian] = guardianPricing[_guardian];
        emit GuardianAdded(_orderId, _guardian, guardianPricing[_guardian]);
    }

    // Internal function to remove a guardian from an order
    function _removeGuardian(uint256 _orderId, address _guardian) internal {
        Order storage order = orders[_orderId];
        bool found = false;

        for (uint256 i = 0; i < order.guardians.length; i++) {
            if (order.guardians[i] == _guardian) {
                //swapping with the last array element and then popping
                order.guardians[i] = order.guardians[order.guardians.length - 1];
                order.guardians.pop();
                found = true;
                break;
            }
        }

        require(found, "Guardian not found");
        emit GuardianRemoved(_orderId, _guardian);
    }

    // Distribute payments to guardians and platform, adjusting payments proportionally
    function distributePayments(uint256 _orderId) private {
        Order storage order = orders[_orderId];
        require(order.isActive, "Order is already completed or cancelled");
        uint256 guardiansLength = order.guardians.length;

        // Distribute payments to guardians proportionally
        if (order.totalPayment > 0) {
            for (uint256 i = 0; i < guardiansLength; i++) {
                address guardian = order.guardians[i];
                uint256 originalPayment = guardianPayments[_orderId][guardian];
                // Calculate proportional payment
                uint256 proportionalPayment = (originalPayment * (10000 - platformFee)) / 10000;
                require(paymentToken.transfer(guardian, proportionalPayment), "Payment to guardian failed");
                emit PaymentDistributed(_orderId, guardian, proportionalPayment);
            }
        }

        order.isActive = false;
    }

    // Retrieve the details of an order by its ID
    function getOrderDetails(uint256 _orderId) external view returns (address, address[] memory, uint256, bool, uint256) {
        Order storage order = orders[_orderId];
        return (
            order.creator,
            order.guardians,
            order.creationTime,
            order.isActive,
            order.totalPayment
        );
    }

    function calculateTotalPrice(address[] memory _guardians) public view returns (uint256 totalPrice) {
        for (uint256 i = 0; i < _guardians.length; i++) {
            totalPrice += guardianPricing[_guardians[i]];
        }
    }

    // Helper function to check if an address is a guardian of the order
    function isGuardian(Order storage order, address _guardian) private view returns (bool) {
        for (uint i = 0; i < order.guardians.length; i++) {
            if (order.guardians[i] == _guardian) {
                return true;
            }
        }
        return false;
    }

}
