require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  // Your contract's details
  const contractAddress = "0x93172bb4339A8E3c444e1D542b2E4d0042CF3b32";
  const guardians = ["0xE1e5E0b3830454d68aE7B8926540a8AC0FdcabC0"]; // Guardian addresses

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
    "function createOrder(address[] memory _guardians) external",
  ];

  // Instantiate the BuddyGuard contract
  const buddyGuardContract = new ethers.Contract(contractAddress, buddyGuardAbi, wallet);

  console.log(`Creating order ...`);

  // Create the order
  const tx = await buddyGuardContract.createOrder(guardians);
  await tx.wait();

  console.log(`Order created successfully. Transaction hash: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
