require("dotenv").config();
const { ethers } = require("hardhat");

async function changeGuardians() {
  const provider = ethers.provider; // Get the current network provider
  const userPrivateKey = process.env.PRIVATE_KEY_User; 
  const userWallet = new ethers.Wallet(userPrivateKey, provider);

  const buddyGuardAddress = "0x42f034CD03E06087870cF0D662EA6dB389E3364f"; 

  const BuddyGuardABI = [
    "function changeGuardians(uint256 _orderId, address[] calldata _guardiansToAdd, address[] calldata _guardiansToRemove) external",
  ];
  const buddyGuard = new ethers.Contract(buddyGuardAddress, BuddyGuardABI, userWallet);

  const orderId = 0; 
  const guardiansToAdd = ["0x2648cfE97e33345300Db8154670347b08643570b"]; 
  const guardiansToRemove = []; 

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
