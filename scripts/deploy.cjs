const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("----------------------------------------------------");
  console.log("Deploying WarrantyCheck contract with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH/BOT");
  console.log("----------------------------------------------------");

  console.log("Fetching current network fee data...");
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || 20000000000n;
  console.log("Using gasPrice:", gasPrice.toString());

  console.log("Deploying WarrantyCheck contract...");
  const WarrantyCheckFactory = await ethers.getContractFactory("WarrantyCheck");
  const warrantyCheck = await WarrantyCheckFactory.deploy({
    gasPrice: gasPrice,
  });

  const tx = warrantyCheck.deploymentTransaction();
  console.log("🚀 Deployment transaction broadcast!");
  if (tx) {
    console.log("Transaction Hash:", tx.hash);
    console.log(`Track on BOT Scan: https://scan.bohr.life/tx/${tx.hash}`);
  }

  console.log("Waiting for block confirmation on BOT Chain...");
  await warrantyCheck.waitForDeployment();

  const contractAddress = await warrantyCheck.getAddress();
  console.log("----------------------------------------------------");
  console.log("✅ WarrantyCheck successfully deployed to:", contractAddress);
  console.log(`View on BOT Scan: https://scan.bohr.life/address/${contractAddress}`);

  // Authorize deployer as initial seller (already done in constructor)
  const isAuthorized = await warrantyCheck.isSellerAuthorized(deployer.address);
  console.log(`Deployer (${deployer.address}) authorized as seller:`, isAuthorized);

  // Save deployment address and info to frontend config
  const deploymentsDir = path.join(__dirname, "../src/config");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const deploymentInfo = {
    contractAddress,
    deployer: deployer.address,
    networkName: network.name,
    chainId,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(deploymentsDir, "contractAddress.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Saved deployment configuration to src/config/contractAddress.json");
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
