# Pythia - Decentralized Prediction Markets on Sui

Pythia is a decentralized prediction market platform built on the Sui blockchain. It empowers users to create, participate in, and resolve markets on real-world events, leveraging the high scalability and low latency of the Sui network.

## Features

- **Prediction Markets**: Seamlessly create and trade on markets for any future event.
- **Unified Wallet Access**: Log in effortlessly using Google accounts (zkLogin) or connect standard Sui wallets.
- **Decentralized & Secure**: Fully on-chain logic ensures transparency and security for all market data and funds.
- **Community Driven**: Built for the community, with tools for decentralized moderation and dispute resolution.

## Prerequisites

Before you begin, install the following:

- [Suibase](https://suibase.io/how-to/install.html)
- [Node (>= 20)](https://nodejs.org/en/download/)
- [pnpm (>= 9)](https://pnpm.io/installation)

## Installation

### Option 1. Use the Github template

1. [Create a new project from the template](https://github.com/new?template_name=sui-dapp-starter&template_owner=suiware&name=my-sui-dapp).

2. Clone the resulting repo locally.

3. Choose a template by running the corresponding init command:

| Template | Init command |
| --- | --- |
| Greeting (React) | `pnpm init:template:greeting-react` |
| Greeting (Next.js) | `pnpm init:template:greeting-next` |
| Counter (React) | `pnpm init:template:counter-react` |

[Template Guide](https://sui-dapp-starter.dev/docs/templates)

### Option 2. Use CLI

```bash
pnpm create sui-dapp@latest
```

This way you'll be able to configure the project step-by-step.

## Usage

#### 1. Run the local Sui network:

```bash
pnpm localnet:start
```

Local Sui Explorer will be available on [localhost:9001](http://localhost:9001/)

#### 2. Deploy the demo contract to the local network:

```bash
pnpm localnet:deploy
```

_This command skips dependency verifications to prevent dependency version mismatch issues, which are caused by local and remote Sui version mismatch. The deploy commands for devnet, testnet and mainnet do perform such verifications._

#### 3. Switch to the local network in your browser wallet settings.

#### 4. Fund your localnet account/address:

You have a few options here:

a) Use the Faucet button integrated into your wallet (e.g. Sui Wallet).

b) Copy the localnet address from your wallet and run the following in your console:

```bash
pnpm localnet:faucet 0xYOURADDRESS
```

c) Run the app and use the Faucet button in the footer.

#### 5. Run the app:

```bash
pnpm start
```
Find all commands in the [documentation](https://sui-dapp-starter.dev/docs/misc/commands/).

## Test

#### Backend

```bash
pnpm test
```

## Docs & Support

- [Sui dApp Starter Docs](https://sui-dapp-starter.dev/docs)
- [Available PNPM Commands](https://sui-dapp-starter.dev/docs/misc/commands/)
- [@suiware/kit Docs](https://www.npmjs.com/package/@suiware/kit)
- [Discord Support](https://discord.com/invite/HuDPpXz4Hx)  

## Useful Links

- [Useful VSCode Extensions](./.vscode/extensions.json)
- [Suibase Docs](https://suibase.io/intro.html)
- [Move Book](https://move-book.com/)
- [Sui Move: Code Conventions](https://docs.sui.io/concepts/sui-move-concepts/conventions)
- [@mysten/create-dapp - official starter](https://www.npmjs.com/package/@mysten/create-dapp)
- [Awesome Sui](https://github.com/sui-foundation/awesome-sui)

## License & Copyright

Copyright (c) 2024 Konstantin Komelin and other contributors

Code is licensed under [MIT](https://github.com/suiware/sui-dapp-starter?tab=MIT-1-ov-file)

SVG Graphics used for NFTs is licensed under [CC-BY 4.0](https://github.com/suiware/sui-dapp-starter?tab=CC-BY-4.0-2-ov-file)
