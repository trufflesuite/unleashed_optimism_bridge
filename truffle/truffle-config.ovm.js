// create a file at the root of your project and name it .env -- there you can set process variables
// like the mnemomic below. Note: .env is ignored by git in this project to keep your private information safe
require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

const goerliMnemonic = process.env["GOERLI_MNEMONIC"];
const infuraKey = process.env["INFURA_KEY"];

module.exports = {
  /**
   * contracts_build_directory tells Truffle where to store compiled contracts
   */
  contracts_build_directory: "../client/contracts/optimism-contracts",

  /**
   *  contracts_directory tells Truffle where to find your contracts
   */
  contracts_directory: "./contracts/optimism",

  networks: {
    optimistic_goerli: {
      network_id: 420,
      chain_id: 420,
      provider: function () {
        return new HDWalletProvider(goerliMnemonic, "https://optimism-goerli.infura.io/v3/" + infuraKey, 0, 1);
      }
    },
  },

  mocha: {
    timeout: 100000,
  },
  compilers: {
    solc: {
      version: "0.8.4", //node_modules/@eth-optimism/solc",
      settings: {
        optimizer: {
          enabled: true,
          runs: 800,
        },
      },
    },
  },
  db: {
    enabled: false,
  },
};
