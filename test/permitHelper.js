const { ethers } = require("ethers");

// Simplified ABI focusing on the permit and nonces functions.
const usdcAbi = [
    "function name() view returns (string)",
    "function nonces(address owner) view returns (uint)",
    "function DOMAIN_SEPARATOR() view returns (bytes32)",
    "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)"
];

// USDC contract address
const usdcAddress = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

async function getPermitSignatureData(signer, usdcContract, owner, spender, value, deadline) {
    // Fetch nonce for owner directly from the contract
    const nonce = await usdcContract.nonces(owner);
    
    // Fetch the domain separator directly from the contract
    const domainSeparator = await usdcContract.DOMAIN_SEPARATOR();
    
    // Construct the domain data using the domain separator
    const domain = {
        name: await usdcContract.name(),
        version: '1', // Ensure this version matches your contract's version
        chainId: await signer.getChainId(), // Dynamically fetch the chain ID
        verifyingContract: usdcContract.address // Use the contract address directly
    };

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
        nonce,
        deadline
    };

    // Sign the permit using EIP-712 typed data signing
    const signature = await signer._signTypedData(domain, types, valueToSign);
    const { r, s, v } = ethers.utils.splitSignature(signature);

    return { v, r, s, deadline };
}

module.exports = { getPermitSignatureData, usdcAbi, usdcAddress };
