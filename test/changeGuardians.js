require("dotenv").config();
const { ethers } = require("hardhat");

async function changeGuardians() {
  const provider = ethers.provider; // Get the current network provider
  const userPrivateKey = process.env.PRIVATE_KEY_User; 
  const userWallet = new ethers.Wallet(userPrivateKey, provider);

  const buddyGuardAddress = "0x93172bb4339A8E3c444e1D542b2E4d0042CF3b32"; 

  const BuddyGuardABI = [
    "function changeGuardians(uint256 _orderId, address[] calldata _guardiansToAdd, address[] calldata _guardiansToRemove) external",
  ];
  const buddyGuard = new ethers.Contract(buddyGuardAddress, BuddyGuardABI, userWallet);

  const orderId = 1; 
  const guardiansToAdd = []; 
  const guardiansToRemove = ["0x2648cfE97e33345300Db8154670347b08643570b"]; 

  const tx = await buddyGuard.changeGuardians(orderId, guardiansToAdd, guardiansToRemove);
  await tx.wait();

  console.log("Guardians changed successfully");
}

changeGuardians()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
