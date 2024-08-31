# pkp-xrpl

`pkp-xrpl` is a modified version of the Wallet from `xrpl.js`, designed specifically to work with PKP (Programmable Key Pair) wallets on the XRP Ledger (XRPL). It provides seamless integration between Lit Protocol's PKP system and XRPL transactions.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Features

- Create and manage XRPL wallets using Lit Protocol's PKP system
- Sign XRPL transactions securely with PKP
- Support for both classic and X-addresses
- Seamless integration with `xrpl.js` library

## Installation

Install `pkp-xrpl` and its peer dependency `xrpl` using npm, yarn, or pnpm:

```bash
npm install pkp-xrpl xrpl @lit-protocol/lit-node-client

# or
yarn add pkp-xrpl xrpl @lit-protocol/lit-node-client

# or
pnpm add pkp-xrpl xrpl @lit-protocol/lit-node-client
```

## Usage

Here's a basic example of how to use `pkp-xrpl`:

```typescript
import { PKPXrplWallet } from 'pkp-xrpl';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { Client } from 'xrpl';

async function main() {
  // Initialize Lit Node Client
  const litNodeClient = new LitNodeClient({ litNetwork: 'datil-dev' });
  await litNodeClient.connect();

  // Create PKPXrplWallet instance
  const pkpWallet = new PKPXrplWallet({
    controllerSessionSigs: sessionSigs, // Obtained from Lit login process
    pkpPubKey: pkpPubKey, // Obtained from Lit login process
    litNodeClient,
  });

  // Initialize the wallet
  await pkpWallet.init();

  console.log('Wallet classic address:', pkpWallet.classicAddress);
  console.log('Wallet X-address:', pkpWallet.getXAddress());

  // Connect to XRPL
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  // Now you can use pkpWallet and client for XRPL transactions
}

main().catch(console.error);
```

## API Reference

### `PKPXrplWallet`

The main class for interacting with XRPL using a PKP wallet.

#### Constructor

```typescript
new PKPXrplWallet({
  controllerSessionSigs: SessionSigs;
  pkpPubKey: string;
  litNodeClient: LitNodeClient;
})
```

#### Properties

- `publicKey: string` - The compressed public key of the PKP.
- `classicAddress: string` - The classic address derived from the public key.
- `address: string` - Alias for `classicAddress`.

#### Methods

- `init(): Promise<void>` - Initializes the wallet. This method is analogous to `LitNodeClient.connect()`. Either `init()` or `LitNodeClient.connect()` must be called before using other methods
- `sign(transaction: Transaction, multisign?: boolean | string, definitions?: XrplDefinitions): Promise<{ tx_blob: string; hash: string }>` - Signs a transaction.
- `getXAddress(tag?: number | false, isTestnet?: boolean): string` - Gets an X-address for the wallet.
- `getAddress(): Promise<string>` - Returns the classic address of the wallet.
- `runLitAction(toSign: Uint8Array, sigName: string): Promise<any>` - Runs a Lit Action to sign data.
- `runSign(toSign: Uint8Array): Promise<SigResponse>` - Signs data using the PKP.

## Examples

### Signing and Submitting a Transaction

```typescript
import { PKPXrplWallet } from 'pkp-xrpl';
import { Client, xrpToDrops } from 'xrpl';

async function sendPayment(pkpWallet: PKPXrplWallet, destination: string, amount: string) {
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  const prepared = await client.autofill({
    TransactionType: 'Payment',
    Account: pkpWallet.address,
    Amount: xrpToDrops(amount),
    Destination: destination,
  });

  const signed = await pkpWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  console.log('Transaction result:', result.result.meta.TransactionResult);
  await client.disconnect();
}

// Usage
sendPayment(pkpWallet, 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe', '10').catch(console.error);
```

### Using X-addresses

```typescript
const xAddress = pkpWallet.getXAddress(12345, true); // With tag 12345, testnet
console.log('X-address:', xAddress);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/something`)
3. Commit your changes (`git commit -m 'feat: add something'`)
4. Push to the branch (`git push origin feature/something`)
5. Open a Pull Request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
