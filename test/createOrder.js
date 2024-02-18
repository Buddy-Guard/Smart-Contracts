require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  // Your contract's details
  const contractAddress = "0x4EeFA835A807c36DD0a643A7D97cD6E2b8Ca29c2";
  const tokenAddress = "0xD21341536c5cF5EB1bcb58f6723cE26e8D8E90e4"; // ERC20 token used for payment
  const guardians = ["0xE1e5E0b3830454d68aE7B8926540a8AC0FdcabC0"]; // Guardian addresses
  const payment = ethers.utils.parseUnits("75", "1"); // Payment amount in tokens

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
    "function createOrder(address _token, address[] calldata _guardians, uint256 _payment) external",
  ];

  // Instantiate the BuddyGuard contract
  const buddyGuardContract = new ethers.Contract(contractAddress, buddyGuardAbi, wallet);

  console.log(`Creating order with payment: ${payment.toString()} tokens...`);
  
  // Approve the BuddyGuard contract to spend tokens on behalf of the user
  const tokenAbi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
  ];
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, wallet);
  await tokenContract.approve(contractAddress, payment);

  // Create the order
  const tx = await buddyGuardContract.createOrder(tokenAddress, guardians, payment);
  await tx.wait();

  console.log(`Order created successfully. Transaction hash: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
