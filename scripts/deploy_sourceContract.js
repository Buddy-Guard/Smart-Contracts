// scripts/deploy_sourceContract.js

async function main() {
    // on sepolia network.
    const routerClientAddress = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
    const linkTokenAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789";

    // Compile our contract
    const SourceContract = await ethers.getContractFactory("SourceContract");

    // Deploy the contract
    const sourceContract = await SourceContract.deploy(routerClientAddress, linkTokenAddress);

    await sourceContract.deployed();

    console.log("SourceContract deployed to:", sourceContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
