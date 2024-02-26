require("dotenv").config(); // Load environment variables
const { ethers } = require("hardhat");

async function main() {
  // Use a general environment variable name for the private key
  const privateKey = process.env.PRIVATE_KEY_Particle;
  
  if (!privateKey) {
    throw new Error("Please set the PRIVATE_KEY environment variable.");
  }

  // Create a new wallet instance with the private key
  const wallet = new ethers.Wallet(privateKey, ethers.provider);
  
  // Address of the BuddyGuard contract
  const contractAddress = "0x42f034CD03E06087870cF0D662EA6dB389E3364f";

  // New pricing
  const newPrice = ethers.utils.parseUnits("0.5", "6"); 

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
