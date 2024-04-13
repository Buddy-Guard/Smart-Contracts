const { ethers } = require("ethers");

// Simplified ABI focusing on the permit and nonces functions.
const usdcAbi = [
    "function name() view returns (string)",
    "function nonces(address owner) view returns (uint256)",
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) nonpayable",
    "function version() pure returns (string)"
];

// USDC contract address
const usdcAddress = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

async function getPermitSignatureData(signer, owner, spender, value, deadline) {
    console.log("Signer address:", signer.address);
    console.log("Owner:", owner);
    console.log("Spender:", spender);
    console.log("Value:", value);
    console.log("Deadline:", deadline);
    
    usdcContract = new ethers.Contract(usdcAddress, usdcAbi, signer);

    // Fetch nonce for owner directly from the contract
    const nonce = await usdcContract.nonces(owner);
    console.log("Nonce:", nonce.toString());
    
    // Fetch the domain separator directly from the contract
    //const domainSeparator = await usdcContract.DOMAIN_SEPARATOR();
    //console.log("Domain Separator:", domainSeparator);
    
    // Construct the domain data using the domain separator
    const domain = {
        name: await usdcContract.name(),
        version: await usdcContract.version(), // Ensure this version matches your contract's version
        chainId: await signer.getChainId(), // Dynamically fetch the chain ID
        verifyingContract: usdcAddress // Use the contract address directly
    };
    console.log("Domain:", domain);

    // Define the EIP-712 types for the permit
    const types = {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
        ]
    };

    // Construct the value to be signed
    const valueToSign = {
        owner,
        spender,
        value,
        nonce: nonce.toString(),
        deadline
    };
    console.log("Types:", types);
    console.log("Value to sign:", valueToSign);

    // Sign the permit using EIP-712 typed data signing
    const signature = await signer._signTypedData(domain, types, valueToSign);
    console.log("Signature:", signature);
    const { v, r, s } = ethers.utils.splitSignature(signature);
    console.log("v:", v, ",r:", r, ",s:", s);

    return { v, r, s};
}


module.exports = { getPermitSignatureData};

