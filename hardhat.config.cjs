require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

function getAccounts() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk || pk.trim() === "" || pk.includes("your_private_key_here")) {
    return [];
  }
  const cleanPk = pk.trim().startsWith("0x") ? pk.trim() : `0x${pk.trim()}`;
  return [cleanPk];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    botchain: {
      url: process.env.BOT_RPC_URL || "https://rpc.bohr.life",
      chainId: 968,
      accounts: getAccounts(),
      gasPrice: 20000000000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./src/artifacts",
  },
};
