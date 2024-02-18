// Import Hardhat's ethers environment
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  // Address of the ERC20 token contract
  const tokenAddress = "0xD21341536c5cF5EB1bcb58f6723cE26e8D8E90e4";
  
  // Address to be authorized
  const spenderAddress = "0x4EeFA835A807c36DD0a643A7D97cD6E2b8Ca29c2";
  
  // Amount of tokens to authorize
  const amount = ethers.utils.parseUnits("200", "ether"); // Assuming the token has 18 decimals, authorize 100 tokens

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
  console.log(`Approving ${spenderAddress} to spend ${ethers.utils.formatUnits(amount, "ether")} tokens.`);
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
