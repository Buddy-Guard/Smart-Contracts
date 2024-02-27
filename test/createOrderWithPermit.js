require("dotenv").config();
const { ethers } = require("hardhat");
const { getPermitSignatureData} = require("./permitHelper");

async function main() {
    const provider = ethers.provider; // Get the current network provider
    const userPrivateKey = process.env.PRIVATE_KEY_Particle;
    if (!userPrivateKey) {
        throw new Error("Please set the PRIVATE_KEY_User environment variable.");
    }
    const userWallet = new ethers.Wallet(userPrivateKey, provider);

    // Correctly initializing the BuddyGuard and USDC contract with ABI and provider
    const buddyGuardAddress = process.env.BuddyGuard_Address;
    const guardians = ["0xE1e5E0b3830454d68aE7B8926540a8AC0FdcabC0"];
    const BuddyGuard = await ethers.getContractFactory("buddyGuard");
    const buddyGuard = await BuddyGuard.attach(buddyGuardAddress).connect(userWallet);
    const totalPrice = await buddyGuard.calculateTotalPrice(guardians);
    console.log("totalprice", totalPrice);

    const deadline = Math.floor(Date.now() / 1000) + 3600; // Deadline 1 hour from now
    
    // Using the corrected function to get permit signature data
    const permitData = await getPermitSignatureData(
        userWallet,
        userWallet.address,
        buddyGuardAddress,
        totalPrice,
        deadline
    ); 

    // Correctly calling createOrderWithPermit with permit signature
    // Ensure the buddyGuard contract ABI includes createOrderWithPermit correctly
    const tx = await buddyGuard.createOrderWithPermit(guardians, deadline, permitData.v, permitData.r, permitData.s);
    await tx.wait();

    console.log("Order created successfully with permit.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
