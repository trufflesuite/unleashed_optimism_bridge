# Optimism Bridge Box

## Guide

To see a more detailed explanation of this box, plus see how one might build on top of it, please see our guide [here](www.trufflesuite.com/guides/optimism-bridge-widget).

## Introduction

Truffle Optimism Bridge Box provides you with setup necessary to start building applications between multiple Ethereum network layers.

This box contains contracts that interact with the Optimism bridge on L1 and L2, along with a set of migrations for deploying, calling functions, and passing messages and value between both layers.

---

- [Requirements](#requirements)
- [Installation](#installation)
- [Setup](#setup)
  - [Installing dependencies](#installing-dependencies)
  - [Using the .env File](#using-the-env-file)
- [Bridging](#bridging)
- [Messaging Demo](#messaging-demo)
  - [Known Issues](#known-issues)
- [Developing for Optimism](#developing-for-optimism)
- [Support](#support)

<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>

## Requirements

We recommend following these instructions [here](https://trufflesuite.com/docs/truffle/getting-started/installation/). The Optimism Box has the following requirements:

- [Node.js](https://nodejs.org/) v12 - 16 or later
- [NPM](https://docs.npmjs.com/cli/) version 5.2 or later
- Windows, Linux or MacOS
- An [Infura](https://infura.io/) account and Project ID
- A [MetaMask](https://metamask.io/) account

## Installation

```bash
$ truffle unbox optimism-bridge <DIRECTORY_NAME>
```

## Setup

### Installing dependencies

`truffle unbox` should run `npm install` as part of the unboxing process.

### Using the env File

You will need the goerli mnemonic to use with the network. The `.dotenv` npm package has been installed for you, and you will need to create a `.env` file for storing your mnemonic and any other needed private information.

The `.env` file is ignored by git in this project to help protect your private data. It is good security practice to avoid committing information about your private keys to github. The `truffle-config.ovm.js` file expects a `GOERLI_MNEMONIC` value to exist in `.env` for running commands on the Goerli and Optimism Goerli testnets and an `INFURA_KEY` to connect to the network.

If you are unfamiliar with using `.env` for managing your mnemonics and other keys, the basic steps for doing so are below:

1. Run `cp .env.example .env` in the command line to copy some important variables into a private `.env` file.
2. Open the `.env` file in your preferred IDE
3. Fill in your mnemonic for the networks you intend to use, as well as your [Infura key](https://blog.infura.io/getting-started-with-infura-28e41844cc89/).
4. As you develop your project, you can put any other sensitive information in the `.env` file. You can access it from other files with `require('dotenv').config()` and refer to the variable you need with `process.env['<YOUR_VARIABLE>']`.

## Bridging

This box includes:

- An [L1 contract](/contracts/ethereum/GreeterL1.sol) that sends a message over the Optimism bridge.
- A [Migration](/migrations/3_set_L2_greeting.js) that sends a message from Ethereum to Optimism.
- An [L2 contract](/contracts/optimism/GreeterL2.sol) that sends a message over the Optimism bridge.
- A [Migration](/migrations/4_set_L1_greeting.js) that sends a message from Optimism to Ethereum.
- A [script](/scripts/goerli_bridge_message.mjs) to automate the process of compiling contracts, running migrations, and sending messages across each side of the bridge.
- A [script](/scripts/goerli_bridge_value.js) to automate the process of sending ETH and DAI across each side of the bridge.

Once you have installed dependencies and set up your `.env` file, you're ready to start bridging!

## Messaging Demo

Included is a helper [script](/scripts/deploy.mjs) that facilitates the full compilation, migration, and bridging of messages between Goerli and Optimism Goerli. To use it, you will need testnet ETH on those networks. Use [a faucet](https://community.optimism.io/docs/useful-tools/faucets/) to receive some. Additionally, you will need to [add the Optimism addon](https://blog.infura.io/post/infura-launches-support-for-optimistic-ethereum) to your Infura account.

Once youre ready, run:

```bash
npm run deploy
```

This script automates the following steps:

![Migration steps](./optimism-bridge-box.png)

### Migration 1 + 2

The first two migrations are simple contract deploys to each network. These are necessary for the following migrations.

### Migration 3

Upon completion of the migration, you will be prompted with a link to confirm the bridged message via Etherscan:

_Expected output:_

```bash
Updating the L2 Greetings contract from L1! 👋👋
🙌 Greeter txn confirmed on L1! 0xabc...
🛣️  Bridging message to L2 Greeter contract...
🕐 In about 1 minute, check the Greeter contract "read" function: https://goerli-optimistic.etherscan.io/address/0xD4c204223d6F1Dfad0b7a0b05BB0bCaB6665e0c9#readContract
```

Click the link and open the `greet` function to see your greeting!

#### Migration 4

Upon completion of the migration, you will be prompted with a link to confirm the bridged message via Etherscan:

_Expected output:_

```bash
Updating the L1 Greetings contract from L2! 👋
🙌🙌 Greeter txn confirmed on L2! 0x93d390d84e99a0e229ef813afe4b42d2cfed8ac1f8f0711e721cce4eab30046c
🛣️  Bridging message to L1 Greeter contract.
 🕐 This will take at least 1-5 min...
Message not yet received on L1.
 🕐 Retrying in 10 seconds...
📬 Message received! Finalizing...
🎉 Message finalized. Check the L1 Greeter contract "read" function: https://goerli.etherscan.io/address/0x11fB328D5Bd8E27917535b6d40b881d35BC39Be0#readContract
```

Click the link and open the `greet` function to see your greeting!

### Known Issues

There is known issue that occurs under certain network conditions resulting in the failure of migration 4 with the following error:

```bash
Error: Could not find block
@trufflesuite/web3-provider-engine/index.js:163
```

This is due to an issue with a dependency and we are working on a fix. In the meantime, if you encounter this, it is safe to simply rerun that migration with `truffle migrate --network=optimistic_goerli --config=truffle-config.ovm --f 4 --to 4 --skip-dry-run`.

## Briding Eth Demo

The script `goerli_bridge_value.mjs` demonstrates how to send ETH and DAI across each side of the bridge. To run it, you will also need DAI on the Goerli network. You can go to Uniswap to exchange ETH for DAI on Goerli. Then call:

```shell
node ./scripts/goerli_bridge_value.js
```

## Developing for Optimism

To learn more about developing for Optimism, see the [Truffle Optimism Box](https://github.com/truffle-box/optimism-box/)

## Support

Support for this box is available via the Truffle community available [here](https://www.trufflesuite.com/community).
