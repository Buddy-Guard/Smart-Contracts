require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  // Your contract's details
  const contractAddress = "0x42f034CD03E06087870cF0D662EA6dB389E3364f";
  const tokenAddress = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; // ERC20 token used for payment
  const guardians = ["0xE1e5E0b3830454d68aE7B8926540a8AC0FdcabC0"]; // Guardian addresses
  const payment = ethers.utils.parseUnits("10", "6"); // Payment amount in tokens

  // Check for PRIVATE_KEY in the environment variables
  if (!process.env.PRIVATE_KEY_User) {
    console.log("Please set your PRIVATE_KEY in a .env file");
    process.exit(1);
  }

  // Connect to the network using the provided PRIVATE_KEY
  const provider = ethers.provider; // Get the current network provider
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_User, provider); // Create a Wallet instance
  
  // ABI for the createOrder function of the BuddyGuard contract
  const buddyGuardAbi = [
    "function createOrder(address[] calldata _guardians, uint256 _payment) external",
  ];

  // Instantiate the BuddyGuard contract
  const buddyGuardContract = new ethers.Contract(contractAddress, buddyGuardAbi, wallet);

  console.log(`Creating order with payment: ${payment.toString()} tokens...`);

  // Create the order
  const tx = await buddyGuardContract.createOrder(guardians, payment);
  await tx.wait();

  console.log(`Order created successfully. Transaction hash: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
