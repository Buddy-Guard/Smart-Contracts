// scripts/deploy_buddyGuardCcip.js

async function main() {
    // 'buddyGuardCcip' is the name of the contract in this context.
    const BuddyGuardCcip = await ethers.getContractFactory("buddyGuardCcip");

    // 'routerAddressHere' on fuji networks
    const routerAddress = "0xF694E193200268f9a4868e4Aa017A0118C9a8177"; // This should be the actual router address.
    const buddyGuardCcip = await BuddyGuardCcip.deploy(routerAddress);

    await buddyGuardCcip.deployed();

    console.log("buddyGuardCcip deployed to:", buddyGuardCcip.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
