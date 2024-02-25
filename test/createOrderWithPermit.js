require("dotenv").config();
const { ethers } = require("hardhat");
const { getPermitSignatureData, usdcAbi, usdcAddress } = require("./permitHelper");

async function main() {
    const provider = ethers.provider; // Get the current network provider
    const userPrivateKey = process.env.PRIVATE_KEY_User;
    if (!userPrivateKey) {
        throw new Error("Please set the PRIVATE_KEY_User environment variable.");
    }
    const userWallet = new ethers.Wallet(userPrivateKey, provider);

    // Correctly initializing the BuddyGuard and USDC contract with ABI and provider
    const buddyGuardAddress = "0x42f034CD03E06087870cF0D662EA6dB389E3364f";
    const guardianAddress = "0xE1e5E0b3830454d68aE7B8926540a8AC0FdcabC0";
    const BuddyGuard = await ethers.getContractFactory("buddyGuard");
    const buddyGuard = await BuddyGuard.attach(buddyGuardAddress).connect(userWallet);
    
    // Correctly initializing the USDC contract with ABI and provider
    const token = new ethers.Contract(usdcAddress, usdcAbi, provider);

    const nonce = await token.nonces(userWallet.address);
    const value = ethers.utils.parseUnits("2", 6); // Assuming USDC has 6 decimals
    const deadline = Math.floor(Date.now() / 1000) + 3600; // Deadline 1 hour from now
    
    // Using the corrected function to get permit signature data
    const domainData = await domain(token); // This function needs to be correctly implemented in permitHelper
    const permitData = await getPermitSignatureData(domainData, {
        owner: userWallet.address,
        spender: buddyGuardAddress,
        value,
        nonce,
        deadline
    }, userWallet); // This assumes `getPermitSignatureData` is correctly implemented to sign data

    // Guardians array for createOrderWithPermit call
    const guardians = [guardianAddress];
    const payment = value;

    // Correctly calling createOrderWithPermit with permit signature
    // Ensure the buddyGuard contract ABI includes createOrderWithPermit correctly
    const tx = await buddyGuard.createOrderWithPermit(guardians, payment.toString(), deadline, permitData.v, permitData.r, permitData.s);
    await tx.wait();

    console.log("Order created successfully with permit.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
