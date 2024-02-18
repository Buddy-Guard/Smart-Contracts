// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//import "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

/**
 * The BuddyGuard contract extends CCIPReceiver to handle cross-chain messages
 * for creating and completing orders. It utilizes direct execution of received
 * message data, requiring careful validation and formatting of the data.
 */
contract buddyGuardCcip is Ownable, CCIPReceiver {
//    IEAS public eas;
//    bytes32 constant schema = 0x7fe79bf55dc0df94d72d713067bb6162828f6c7b66458ea3661b41d4d02fc40f;
    mapping(address => uint256) public guardianPricing;
    mapping(uint256 => Order) public orders;
    uint256 public orderCount;
    // Platform fee in basis points (bps). 100 bps = 1%
    uint256 public platformFee = 50000; // 5% fee
    mapping(uint256 => mapping(address => uint256)) public guardianPayments; // Records payments to guardians

    event OrderCreated(uint256 indexed orderId, address indexed creator, address token, uint256 payment);
    event GuardianAdded(uint256 indexed orderId, address indexed guardian, uint256 payment);
    event GuardianRemoved(uint256 indexed orderId, address indexed guardian);
    event OrderCompleted(uint256 indexed orderId);
    event OrderExpired(uint256 indexed orderId, address indexed guardian);
    event PaymentDistributed(uint256 indexed orderId, address indexed guardian, uint256 amount);
    event PlatformFeeUpdated(uint256 newFee);
    event GuardianPricingUpdated(address indexed guardian, uint256 newPricing);
    event ActionSuccessful();

    struct Order {
        address creator;
        address[] guardians;
        uint256 creationTime;
        bool isActive;
        IERC20 token;
        uint256 totalPayment;
    }

    //constructor(address _easAddress) {
    //    eas = IEAS(_easAddress);
    //}

    constructor(address router) CCIPReceiver(router) {}

    // Set or update guardian pricing
    function setGuardianPricing(uint256 _price) external {
        guardianPricing[msg.sender] = _price;
        emit GuardianPricingUpdated(msg.sender, _price);
    }

    // Create an order with initial guardians
    function createOrder(address _token, address[] calldata _guardians, uint256 _payment) external {
        uint256 totalPrice = calculateTotalPrice(_guardians);
        require(_payment >= totalPrice, "Insufficient payment");
        IERC20 token = IERC20(_token);
        require(token.transferFrom(msg.sender, address(this), _payment), "Payment transfer failed");

        if (_payment > totalPrice) {
            require(token.transfer(msg.sender, _payment - totalPrice), "Refund failed");
        }

        Order storage order = orders[orderCount];
        order.creator = msg.sender;
        order.creationTime = block.timestamp;
        order.isActive = true;
        order.token = token;
        order.totalPayment = totalPrice;

        for (uint256 i = 0; i < _guardians.length; i++) {
            order.guardians.push(_guardians[i]);
            guardianPayments[orderCount][_guardians[i]] = guardianPricing[_guardians[i]];
            emit GuardianAdded(orderCount, _guardians[i], guardianPricing[_guardians[i]]);
        }

        emit OrderCreated(orderCount, msg.sender, _token, totalPrice);
        orderCount++;
    }

    // Remove a single guardian from an order
    function removeGuardian(uint256 _orderId, address _guardian) external {
        require(orders[_orderId].creator == msg.sender, "Only order creator can remove guardian");
        // Implement logic
        Order storage order = orders[_orderId];
        require(order.isActive, "Order is not active");

        bool found = false;
        uint256 guardianPayment = guardianPayments[_orderId][_guardian];
        for (uint256 i = 0; i < order.guardians.length; i++) {
            if (order.guardians[i] == _guardian) {
                order.guardians[i] = order.guardians[order.guardians.length - 1];
                order.guardians.pop();
                found = true;
                break;
            }
        }

        require(found, "Guardian not found in order");
        if (guardianPayment > 0) {
            require(order.token.transfer(msg.sender, guardianPayment), "Refund failed");
        }

        emit GuardianRemoved(_orderId, _guardian);
    }

    // Remove multiple guardians from an order
    function removeGuardians(uint256 _orderId, address[] calldata _guardians) external {
        require(orders[_orderId].creator == msg.sender, "Only order creator can remove guardians");
        Order storage order = orders[_orderId];
        require(order.isActive, "Order is not active");

        uint256 totalRefund = 0;
        for (uint256 g = 0; g < _guardians.length; g++) {
            bool found = false;
            for (uint256 i = 0; i < order.guardians.length && !found; i++) {
                if (order.guardians[i] == _guardians[g]) {
                    totalRefund += guardianPayments[_orderId][_guardians[g]];
                    order.guardians[i] = order.guardians[order.guardians.length - 1];
                    order.guardians.pop();
                    found = true;
                }
            }

            if (!found) continue; // Skip if guardian not found
            emit GuardianRemoved(_orderId, _guardians[g]);
        }

        if (totalRefund > 0) {
            require(order.token.transfer(msg.sender, totalRefund), "Refund failed");
        }
    }

    // Complete an order and distribute tokens
    function completeOrder(uint256 _orderId) external {
        require(orders[_orderId].creator == msg.sender, "Only order creator can complete order");
        distributePayments(_orderId);
        emit OrderCompleted(_orderId);
    }

    // Trigger expired order and distribute tokens
    function trigExpiredOrder(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(isGuardian(order, msg.sender), "Only assigned guardian can trigger");
        require(block.timestamp > order.creationTime + 48 hours, "Order duration not yet expired");
        require(order.isActive, "Order is already completed or cancelled");

        distributePayments(_orderId);
        emit OrderExpired(_orderId, msg.sender);
    }


    // Distribute payments to guardians and platform, adjusting payments proportionally
    function distributePayments(uint256 _orderId) private {
        Order storage order = orders[_orderId];
        uint256 totalPayment = order.totalPayment;

        // Calculate and transfer platform fee
        uint256 platformFeeAmount = (totalPayment * platformFee) / 10000;
        require(order.token.transfer(owner(), platformFeeAmount), "Platform fee transfer failed");

        // Calculate net amount available for guardians after deducting platform fee
        uint256 netAmountForGuardians = totalPayment - platformFeeAmount;
        // Calculate total requested payment to guardians to determine proportions
        uint256 totalRequestedPayment = 0;
        for (uint256 i = 0; i < order.guardians.length; i++) {
            totalRequestedPayment += guardianPayments[_orderId][order.guardians[i]];
        }
        // Distribute payments to guardians proportionally
        if (totalRequestedPayment > 0) {
            for (uint256 i = 0; i < order.guardians.length; i++) {
                address guardian = order.guardians[i];
                uint256 originalPayment = guardianPayments[_orderId][guardian];
                // Calculate proportional payment
                uint256 proportionalPayment = (netAmountForGuardians * originalPayment) / totalRequestedPayment;
                require(order.token.transfer(guardian, proportionalPayment), "Payment to guardian failed");
                emit PaymentDistributed(_orderId, guardian, proportionalPayment);
            }
        }

        order.isActive = false;
    }

    /**
     * Handles incoming CCIP messages by directly executing the message data.
     * This function assumes the message data is already formatted for direct
     * execution, i.e., it contains the encoded function signature and parameters.
     */
    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        // Directly execute the call using the received message data
        (bool success, ) = address(this).call(message.data);
        require(success, "Execution failed");
        emit ActionSuccessful();
    }

    // Update platform fee
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }

    // Calculate total price for adding guardians
    function calculateTotalPrice(address[] calldata _guardians) public view returns (uint256 totalPrice) {
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