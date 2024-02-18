require("dotenv").config(); // Load environment variables
const { ethers } = require("hardhat");

async function main() {
  // Use a general environment variable name for the private key
  const privateKey = process.env.PRIVATE_KEY_Guardian;
  
  if (!privateKey) {
    throw new Error("Please set the PRIVATE_KEY environment variable.");
  }

  // Create a new wallet instance with the private key
  const wallet = new ethers.Wallet(privateKey, ethers.provider);
  
  // Address of the BuddyGuard contract
  const contractAddress = "0x4EeFA835A807c36DD0a643A7D97cD6E2b8Ca29c2";

  // New pricing
  const newPrice = ethers.utils.parseUnits("25", "0"); 

  // ABI of the BuddyGuard contract
  const buddyGuardABI = [
    "function setGuardianPricing(uint256 _price) external",
  ];

  // Connect to the BuddyGuard contract with the wallet
  const buddyGuard = new ethers.Contract(contractAddress, buddyGuardABI, wallet);

  // Call the setGuardianPricing function
  const tx = await buddyGuard.setGuardianPricing(newPrice);
  await tx.wait();

  console.log(`Guardian pricing has been set to ${newPrice.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
