import { sha512 } from '@xrplf/isomorphic/sha512'
import { bytesToHex, hexToBytes } from '@xrplf/isomorphic/utils'
import { decode, encode } from 'ripple-binary-codec'
import { ValidationError } from './errors'
import { Transaction } from './models/transactions'

const HASH_BYTES = 32

/**
 * Compute a sha512Half Hash of a hex string.
 *
 * @param hex - Hex string to hash.
 * @returns Hash of hex.
 */
function sha512Half(hex: string): string {
  return bytesToHex(sha512(hexToBytes(hex)).slice(0, HASH_BYTES))
}

enum HashPrefix {
  // transaction plus signature to give transaction ID 'TXN'
  TRANSACTION_ID = 0x54584e00,

  // transaction plus metadata 'TND'
  TRANSACTION_NODE = 0x534e4400,

  // inner node in tree 'MIN'
  INNER_NODE = 0x4d494e00,

  // leaf node in tree 'MLN'
  LEAF_NODE = 0x4d4c4e00,

  // inner transaction to sign 'STX'
  TRANSACTION_SIGN = 0x53545800,

  // inner transaction to sign (TESTNET) 'stx'
  TRANSACTION_SIGN_TESTNET = 0x73747800,

  // inner transaction to multisign 'SMT'
  TRANSACTION_MULTISIGN = 0x534d5400,

  // ledger 'LWR'
  LEDGER = 0x4c575200,
}

/**
 * Hashes the Transaction object as the ledger does. Throws if the transaction is unsigned.
 *
 * @param tx - A transaction to hash. Tx may be in binary blob form. Tx must be signed.
 * @returns A hash of tx.
 * @throws ValidationError if the Transaction is unsigned.\
 * @category Utilities
 */
export function hashSignedTx(tx: Transaction | string): string {
  let txBlob: string
  let txObject: Transaction
  if (typeof tx === 'string') {
    txBlob = tx
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Required until updated in binary codec. */
    txObject = decode(tx) as unknown as Transaction
  } else {
    txBlob = encode(tx)
    txObject = tx
  }

  if (
    txObject.TxnSignature === undefined &&
    txObject.Signers === undefined &&
    txObject.SigningPubKey === undefined
  ) {
    throw new ValidationError('The transaction must be signed to hash it.')
  }

  const prefix = HashPrefix.TRANSACTION_ID.toString(16).toUpperCase()
  return sha512Half(prefix.concat(txBlob))
}