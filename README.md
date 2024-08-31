# pkp-xrpl

`pkp-xrpl` is a modified version of the Wallet module from `xrpl.js`, designed to work with PKP (Programmable Key Pair) wallets.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Example](#example)
- [Contributing](#contributing)
- [License](#license)

## Installation

You can install `pkp-xrpl` using npm, yarn, or pnpm:

```bash
npm install pkp-xrpl xrpl

# or

yarn add pkp-xrpl xrpl

# or

pnpm add pkp-xrpl xrpl
```

## Usage

To use `pkp-xrpl`, you need to import the `PKPXrplWallet` class and initialize it with your PKP wallet details. Here's a basic example:

```typescript
import { PKPXrplWallet } from 'pkp-xrpl';
import { Client } from 'xrpl';

const pkpWallet = new PKPXrplWallet({
  controllerSessionSigs: sessionSigs,
  pkpPubKey: currentAccount.publicKey,
  litNodeClient,
});

await pkpWallet.init();

const client = new Client('wss://s.altnet.rippletest.net:51233');
await client.connect();

// Now you can use pkpWallet and client for XRPL transactions
```

## API Reference

### `PKPXrplWallet`

The main class for interacting with XRPL using a PKP wallet.

#### Constructor

```typescript
new PKPXrplWallet({
  controllerSessionSigs: SessionSigs;
  pkpPubKey: string;
  litNodeClient: ILitNodeClient;
})
```

#### Methods

- `init(): Promise<void>` - Initializes the wallet.
- `sign(transaction: any): Promise<{ tx_blob: string; hash: string }>` - Signs a transaction.
- `getClassicAddress(): string` - Returns the classic address of the wallet.

### `Client`

The `Client` class from `xrpl.js` is used to interact with the XRPL network.

## Example

Here's a complete example demonstrating how to use `pkp-xrpl` to send a payment on the XRPL testnet:

```typescript
import { PKPXrplWallet } from 'pkp-xrpl';
import {
  TransactionMetadata,
  Client,
  xrpToDrops,
  dropsToXrp,
  getBalanceChanges,
} from 'xrpl';

async function main() {
  // Initialize PKP Wallet
  const pkpWallet = new PKPXrplWallet({
    controllerSessionSigs: sessionSigs,
    pkpPubKey: currentAccount.publicKey,
    litNodeClient,
  });
  await pkpWallet.init();
  console.log('Wallet address:', pkpWallet.address);

  // Connect to XRPL
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();
  console.log('Connected to XRPL:', client.isConnected());

  // Prepare transaction
  const prepared = await client.autofill({
    TransactionType: 'Payment',
    Account: pkpWallet.address,
    Amount: xrpToDrops('2'),
    Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
  });

  // Sign and submit transaction
  const signed = await pkpWallet.sign(prepared);
  const tx = await client.submitAndWait(signed.tx_blob);

  // Check results
  console.log('Transaction result:', (tx.result.meta as TransactionMetadata).TransactionResult);
  console.log('Balance changes:', JSON.stringify(getBalanceChanges(tx.result.meta as TransactionMetadata), null, 2));

  await client.disconnect();
}

main().catch(console.error);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License
Apache 2.0