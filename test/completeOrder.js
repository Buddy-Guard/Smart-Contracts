// Import Hardhat's ethers environment
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  // The address of the deployed buddyGuard contract
  const contractAddress = "0x4EeFA835A807c36DD0a643A7D97cD6E2b8Ca29c2";

  // The ID of the order to complete
  const orderId = 3; // Example order ID, replace with actual order ID

  // Connect using the private key from the .env file
  const privateKey = process.env.PRIVATE_KEY_User;
  if (!privateKey) {
    console.error("Please set your PRIVATE_KEY_User in the .env file");
    process.exit(1);
  }

  const provider = ethers.provider; // Get the current network provider
  const signer = new ethers.Wallet(privateKey, provider);
  

  // Connect to the network and get the signer
//  const [signer] = await ethers.getSigners();
  console.log(`Using signer address: ${signer.address}`);

  // The ABI for the buddyGuard contract's `completeOrder` function
  const contractABI = [
    "function completeOrder(uint256 _orderId) external",
  ];

  // Connect to the buddyGuard contract
  const buddyGuard = new ethers.Contract(contractAddress, contractABI, signer);

  // Call the `completeOrder` function
  console.log(`Completing order with ID: ${orderId}`);
  const tx = await buddyGuard.completeOrder(orderId);
  await tx.wait(); // Wait for the transaction to be mined

  console.log(`Order with ID ${orderId} completed successfully. Transaction Hash: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
