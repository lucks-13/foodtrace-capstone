const hre = require("hardhat");

async function main() {
  console.log("hre.ethers:", hre.ethers ? "OK" : "MISSING");  // Debug line
  
  const FoodTrace = await hre.ethers.getContractFactory("FoodTrace");
  const contract = await FoodTrace.deploy();
  await contract.deployed();
  console.log("✅ DEPLOYED TO:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
