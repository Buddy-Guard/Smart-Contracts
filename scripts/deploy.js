const hre = require("hardhat");

async function main() {
   
    const tokenAddress = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; 

   
    const BuddyGuard = await hre.ethers.getContractFactory("buddyGuard");

    
    const buddyGuard = await BuddyGuard.deploy(tokenAddress);

   
    await buddyGuard.deployed();

    console.log(`buddyGuard deployed to: ${buddyGuard.address}`);
}


main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
