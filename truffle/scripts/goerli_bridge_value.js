#! /usr/local/bin/node
require("dotenv").config();
const optimismSDK = require("@eth-optimism/sdk");
const ethers = require("ethers");

const goerliMnemonic = process.env["GOERLI_MNEMONIC"];
const infuraKey = process.env["INFURA_KEY"];
const l1Url = "https://goerli.infura.io/v3/" + infuraKey;
const l2Url = "https://optimism-goerli.infura.io/v3/" + infuraKey;

// Contract addresses for DAI tokens, taken
// from https://static.optimism.io/optimism.tokenlist.json
const daiAddrs = {
  l1Addr: "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844",
  l2Addr: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
}; // daiAddrs

// The ABI fragment for an ERC20 we need to get a user's balance.
const erc20ABI = [
  // balanceOf
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
]; // erc20ABI

const gwei = 1000000000n;
const eth = gwei * gwei; // 10^18
const centieth = eth / 100n;
const dai = eth;

// Global variable because we need them almost everywhere
let crossChainMessenger;
let l1ERC20, l2ERC20; // DAI contracts to show ERC-20 transfers
let addr; // Our address

/**
 * getSigners()
 * Initializes ethers providers and returns wallets.
 */
const getSigners = async () => {
  const l1RpcProvider = new ethers.providers.JsonRpcProvider(l1Url);
  const l2RpcProvider = new ethers.providers.JsonRpcProvider(l2Url);
  const hdNode = ethers.utils.HDNode.fromMnemonic(goerliMnemonic);
  const privateKey = hdNode.derivePath(ethers.utils.defaultPath).privateKey;
  const l1Wallet = new ethers.Wallet(privateKey, l1RpcProvider);
  const l2Wallet = new ethers.Wallet(privateKey, l2RpcProvider);

  return [l1Wallet, l2Wallet];
}; // getSigners

/**
 * setup()
 * Initializes Optimism SDK's Cross Chain Messenger
 */
const setup = async () => {
  const [l1Signer, l2Signer] = await getSigners();
  addr = l1Signer.address;
  crossChainMessenger = new optimismSDK.CrossChainMessenger({
      l1ChainId: 5,    // Goerli value, 1 for mainnet
      l2ChainId: 420,  // Goerli value, 10 for mainnet
      l1SignerOrProvider: l1Signer,
      l2SignerOrProvider: l2Signer
  })
  l1ERC20 = new ethers.Contract(daiAddrs.l1Addr, erc20ABI, l1Signer);
  l2ERC20 = new ethers.Contract(daiAddrs.l2Addr, erc20ABI, l2Signer);
}; // setup

/**
 * reportBalances()
 * Logs ETH balances on L1 and L2.
 */
const reportBalances = async () => {
  const l1Balance = (await crossChainMessenger.l1Signer.getBalance())
    .toString()
    .slice(0, -9);
  const l2Balance = (await crossChainMessenger.l2Signer.getBalance())
    .toString()
    .slice(0, -9);

  console.log(`On L1:${l1Balance} Gwei    On L2:${l2Balance} Gwei`);
}; // reportBalances

/**
 * reportERC20Balances()
 * Logs DAI balances on L1 and L2.
 */
const reportERC20Balances = async () => {
  const l1Balance = (await l1ERC20.balanceOf(addr)).toString().slice(0, -18);
  const l2Balance = (await l2ERC20.balanceOf(addr)).toString().slice(0, -18);
  console.log(`DAI on L1:${l1Balance}     DAI on L2:${l2Balance}`);
}; // reportERC20Balances

/**
 * depositETH()
 * Bridges ETH from L1 to L2 and reports balances
 */
const depositETH = async () => {
  console.log("Deposit ETH");
  await reportBalances();
  const start = new Date();

  const response = await crossChainMessenger.depositETH(gwei);
  console.log(`Transaction hash (on L1): ${response.hash}`);
  await response.wait();
  console.log("Waiting for status to change to RELAYED");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    optimismSDK.MessageStatus.RELAYED
  );

  await reportBalances();
  console.log(`depositETH took ${(new Date() - start) / 1000} seconds\n\n`);
}; // depositETH()

/**
 * depositERC20()
 * Bridges DAI from L1 to L2 and reports balances
 */
const depositERC20 = async () => {
  console.log("Deposit ERC20");
  await reportERC20Balances();
  const start = new Date();

  // Need the l2 address to know which bridge is responsible
  const allowanceResponse = await crossChainMessenger.approveERC20(
    daiAddrs.l1Addr,
    daiAddrs.l2Addr,
    dai
  );
  await allowanceResponse.wait();
  console.log(`Allowance given by tx ${allowanceResponse.hash}`);
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);

  const response = await crossChainMessenger.depositERC20(
    daiAddrs.l1Addr,
    daiAddrs.l2Addr,
    dai
  );
  console.log(`Deposit transaction hash (on L1): ${response.hash}`);
  await response.wait();
  console.log("Waiting for status to change to RELAYED");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    optimismSDK.MessageStatus.RELAYED
  );

  await reportERC20Balances();
  console.log(`depositERC20 took ${(new Date() - start) / 1000} seconds\n\n`);
}; // depositETH()

/**
 * withdrawERC20()
 * Bridges DAI from L2 to L1 and reports balances
 */
const withdrawERC20 = async () => {
  console.log("Withdraw ERC20");
  const start = new Date();
  await reportERC20Balances();

  const response = await crossChainMessenger.withdrawERC20(
    daiAddrs.l1Addr,
    daiAddrs.l2Addr,
    dai
  );
  console.log(`Transaction hash (on L2): ${response.hash}`);
  await response.wait();

  console.log("Waiting for status to change to IN_CHALLENGE_PERIOD");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    optimismSDK.MessageStatus.IN_CHALLENGE_PERIOD
  );
  console.log("In the challenge period, waiting for status READY_FOR_RELAY");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    optimismSDK.MessageStatus.READY_FOR_RELAY
  );
  console.log("Ready for relay, finalizing message now");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.finalizeMessage(response);
  console.log("Waiting for status to change to RELAYED");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response,
    optimismSDK.MessageStatus.RELAYED
  );
  await reportERC20Balances();
  console.log(
    `withdrawERC20 took ${(new Date() - start) / 1000} seconds\n\n\n`
  );
}; // withdrawERC20()

/**
 * withdrawETH()
 * Bridges ETH from L2 to L1 and reports balances
 */
const withdrawETH = async () => {
  console.log("Withdraw ETH");
  const start = new Date();
  await reportBalances();

  const response = await crossChainMessenger.withdrawETH(centieth);
  console.log(`Transaction hash (on L2): ${response.hash}`);
  await response.wait();

  console.log("Waiting for status to change to IN_CHALLENGE_PERIOD");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    optimismSDK.MessageStatus.IN_CHALLENGE_PERIOD
  );
  console.log("In the challenge period, waiting for status READY_FOR_RELAY");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response.hash,
    optimismSDK.MessageStatus.READY_FOR_RELAY
  );
  console.log("Ready for relay, finalizing message now");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.finalizeMessage(response);
  console.log("Waiting for status to change to RELAYED");
  console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
  await crossChainMessenger.waitForMessageStatus(
    response,
    optimismSDK.MessageStatus.RELAYED
  );
  await reportBalances();
  console.log(`withdrawETH took ${(new Date() - start) / 1000} seconds\n\n\n`);
}; // withdrawETH()

/**
 * main()
 * Deposits and withdraws both ETH and DAI
 */
const main = async () => {
  await setup();
  await depositETH();
  await withdrawETH();
  await depositERC20();
  await withdrawERC20();
}; // main

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
