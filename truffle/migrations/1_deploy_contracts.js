var OptimismNFT = artifacts.require("OptimismNFT");
var OptimismMarketplace = artifacts.require("OptimismMarketplace");

module.exports = async function(deployer) {
  await deployer.deploy(OptimismMarketplace);
  const marketplace = await OptimismMarketplace.deployed();
  await deployer.deploy(OptimismNFT, marketplace.address);
}