# pkp-xrpl

This module is a modified version of Wallet from `xrpl.js`.

# Getting Started

## Installation

```bash
npm install pkp-xrpl xrpl
```

```bash
yarn add pkp-xrpl xrpl
```

```bash
pnpm add pkp-xrpl xrpl
```

# Examples

```typescript
import { PKPXrplWallet } from 'pkp-xrpl';
import {
  TransactionMetadata,
  Client,
  xrpToDrops,
  dropsToXrp,
  getBalanceChanges,
} from 'xrpl';

const pkpWallet = new PKPXrplWallet({
  controllerSessionSigs: sessionSigs,
  pkpPubKey: currentAccount.publicKey,
  litNodeClient,
});
await pkpWallet.init();
console.log(pkpWallet.classicAddress);

const client = new Client('wss://s.altnet.rippletest.net:51233');
await client.connect();
console.log(client.isConnected());

const { classicAddressToFund, balance } = await requestFunding(
  {},
  client,
  0,
  pkpWallet.classicAddress,
  {
    destination: pkpWallet.classicAddress,
    userAgent: 'xrpl.js',
  }
);
console.log(classicAddressToFund, balance);

// Prepare transaction -------------------------------------------------------
const prepared = await client.autofill({
  TransactionType: 'Payment',
  Account: pkpWallet.classicAddress,
  Amount: xrpToDrops('2'),
  Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
});
const max_ledger = (prepared as any).LastLedgerSequence;
console.log('Prepared transaction instructions:', prepared);
console.log('Transaction cost:', dropsToXrp((prepared as any).Fee), 'XRP');
console.log('Transaction expires after ledger:', max_ledger);
// Sign prepared instructions ------------------------------------------------
const signed = await pkpWallet.sign(prepared);
console.log('Identifying hash:', signed.hash);
console.log('Signed blob:', signed.tx_blob);

// Submit signed blob --------------------------------------------------------
const tx = await client.submitAndWait(signed.tx_blob);
// Check transaction results -------------------------------------------------
console.log(
  'Transaction result:',
  (tx.result.meta as TransactionMetadata).TransactionResult
);
console.log(
  'Balance changes:',
  JSON.stringify(
    getBalanceChanges(tx.result.meta as TransactionMetadata),
    null,
    2
  )
);
await client.disconnect();
```
