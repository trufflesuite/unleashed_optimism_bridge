import { useRef, useEffect } from "react";
import { useAsyncCallback } from 'react-async-hook';
const optimismSDK = require("@eth-optimism/sdk");
const ethers = require("ethers");
const goerliMnemonic = process.env["NEXT_PUBLIC_GOERLI_MNEMONIC"];
const infuraKey = process.env["NEXT_PUBLIC_INFURA_KEY"];
const l1Url = "https://goerli.infura.io/v3/" + infuraKey;
const l2Url = "https://optimism-goerli.infura.io/v3/" + infuraKey;

// getSigners
// Initializes ethers providers and returns wallets.
const l1RpcProvider = new ethers.providers.JsonRpcProvider(l1Url);
const l2RpcProvider = new ethers.providers.JsonRpcProvider(l2Url);
const hdNode = ethers.utils.HDNode.fromMnemonic(goerliMnemonic);
const privateKey = hdNode.derivePath(ethers.utils.defaultPath).privateKey;
const [l1Signer, l2Signer] = [
  new ethers.Wallet(privateKey, l1RpcProvider),
  new ethers.Wallet(privateKey, l2RpcProvider)
];
// Initializes Optimism SDK's Cross Chain Messenger
const crossChainMessenger = new optimismSDK.CrossChainMessenger({
    l1ChainId: 5,    // Goerli value, 1 for mainnet
    l2ChainId: 420,  // Goerli value, 10 for mainnet
    l1SignerOrProvider: l1Signer,
    l2SignerOrProvider: l2Signer
});

const getL1Eth = async () => {
  console.log("getL1Eth");
  return ethers.utils.formatEther(
    (await crossChainMessenger.l1Signer.getBalance())
    .toString()
  );
};

const getL2Eth = async () => {
  console.log("getL2Eth");
  return ethers.utils.formatEther(
    (await crossChainMessenger.l2Signer.getBalance())
    .toString()
  );
};

const Bridge = () => {
  const l1Balance = useAsyncCallback(getL1Eth, []);
  const l2Balance = useAsyncCallback(getL2Eth, []);
  const depositRef = useRef(null);
  const withdrawRef = useRef(null);

  useEffect(() => {
    l1Balance.execute();
    l2Balance.execute();
  }, [l1Balance.execute, l2Balance.execute]);

  const withdrawEth = async () => {
    console.log("Withdraw ETH");
    const start = new Date();

    const response = await crossChainMessenger.withdrawETH(ethers.utils.parseEther(withdrawRef.current.value));
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
    console.log(`withdrawETH took ${(new Date() - start) / 1000} seconds\n\n\n`);

    l1Balance.execute();
    l2Balance.execute();
  };

  const depositEth = async () => {
    console.log("Deposit ETH");
    const start = new Date();
  
    const response = await crossChainMessenger.depositETH(ethers.utils.parseEther(depositRef.current.value));
    console.log(`Transaction hash (on L1): ${response.hash}`);
    await response.wait();
    console.log("Waiting for status to change to RELAYED");
    console.log(`Time so far ${(new Date() - start) / 1000} seconds`);
    await crossChainMessenger.waitForMessageStatus(
      response.hash,
      optimismSDK.MessageStatus.RELAYED
    );
  
    console.log(`depositETH took ${(new Date() - start) / 1000} seconds\n\n`);

    l1Balance.execute();
    l2Balance.execute();
  };

  return (
    <div className="py-8 px-8 m-8 max-w-md mx-auto bg-white rounded-xl shadow-lg space-y-2 sm:py-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-6">
      <div className="text-center space-y-2 sm:text-left">
        <div className="space-y-0.5"></div>
          <div>
            <div className="txt-lg font-bold">Bridge your ETH!</div>
          </div>
        <div className="my-4 space-y-4">
          <input placeholder="ETH bridged to Optimism" ref={depositRef} type="text" className="focus:outline-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-400 focus:border-teal-400 block w-full p-2.5"/>
          <button onClick={depositEth} className="px-4 py-1 text-sm text-teal-400 font-semibold rounded-lg border border-teal-400 hover:text-white hover:bg-teal-400 hover:border-transparent">Deposit</button>
          {l1Balance.loading && <div>Loading Goerli Eth Balance...</div>}
          {l1Balance.error && <div className="font-semibold">Error: {l1Balance.error.message}</div>}
          {
            l1Balance.result && (
                <div>
                  <span className="text-slate-500">Current Goerli Eth Balance: </span>
                  <span className="font-semibold">{l1Balance.result}</span>
                </div>
            )
          }
          <input placeholder="ETH bridged to Ethereum"ref={withdrawRef} type="text" className="focus:outline-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-400 focus:border-teal-400 block w-full p-2.5"/>
          <button onClick={withdrawEth} className="px-4 py-1 text-sm text-teal-400 font-semibold rounded-lg border border-teal-400 hover:text-white hover:bg-teal-400 hover:border-transparent">Withdraw</button>
          {l2Balance.loading && <div>Loading Optimism Goerli Eth Balance...</div>}
          {l2Balance.error && <div className="font-semibold">Error: {l2Balance.error.message}</div>}
          {
              l2Balance.result && (
                <div>
                  <span className="text-slate-500">Current Optimism Goerli Eth Balance: </span>
                  <span className="font-semibold">{l2Balance.result}</span>
                </div>
              )
            }
          </div>
        </div>
    </div>
  );
}

export default Bridge;