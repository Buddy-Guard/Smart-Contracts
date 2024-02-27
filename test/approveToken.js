// Import Hardhat's ethers environment
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  // Address of the ERC20 token contract
  const tokenAddress = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
  
  // Address to be authorized
  const spenderAddress = process.env.BuddyGuard_Address;
  console.log("Spender Address:", process.env.BuddyGuard_Address);
  
  // Amount of tokens to authorize
  const amount = ethers.utils.parseUnits("2000000", "6"); 

  // Connect using the private key from the .env file
  const privateKey = process.env.PRIVATE_KEY_User;
  if (!privateKey) {
    console.error("Please set your PRIVATE_KEY_User in the .env file");
    process.exit(1);
  }

  const provider = ethers.provider; // Get the current network provider
  const signer = new ethers.Wallet(privateKey, provider);

  console.log("Deployer (owner) address:", signer.address);
  
  // ABI of the ERC20 token contract
  const tokenABI = [
    // Interface description of the `approve` function
    "function approve(address spender, uint256 amount) external returns (bool)"
  ];

  // Connect to the ERC20 token contract
  const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

  // Call the `approve` function
  console.log(`Approving ${spenderAddress} to spend ${ethers.utils.formatUnits(amount, "6")} tokens.`);
  const tx = await tokenContract.approve(spenderAddress, amount);

  // Wait for the transaction to be confirmed
  await tx.wait();
  console.log(`Approval successful. TxHash: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
