import { PKPBase } from '@lit-protocol/pkp-base';
import { PKPBaseProp, PKPWallet, SigResponse } from '@lit-protocol/types';
import * as xrpl from 'xrpl';
import { Transaction, validate, ValidationError, verifySignature } from 'xrpl';
import { hashSignedTx } from 'xrpl/src/utils/hashes';
import BigNumber from 'bignumber.js';
import { omitBy } from 'xrpl/src/utils/collections';
import { hexToBytes } from '@xrplf/isomorphic/utils';
import Sha512 from 'ripple-keypairs/src/utils/Sha512';
import { DER } from '@noble/curves/abstract/weierstrass';
import {
  classicAddressToXAddress,
  isValidXAddress,
  xAddressToClassicAddress,
} from 'ripple-address-codec';
import {
  encodeForSigning,
  encodeForMultisigning,
  encode,
  XrplDefinitions,
} from 'ripple-binary-codec';

export class PKPXrplWallet implements PKPWallet {
  private readonly pkpBase: PKPBase;
  public readonly publicKey: string;
  public readonly classicAddress: string;
  // readonly publicKey: Secp256k1PublicKey;

  constructor(prop: PKPBaseProp) {
    this.pkpBase = PKPBase.createInstance(prop);
    this.publicKey = this.pkpBase.compressedPubKey;
    this.classicAddress = xrpl.deriveAddress(this.pkpBase.compressedPubKey);
  }

  public async sign(
    transaction: Transaction,
    multisign?: boolean | string,
    definitions?: XrplDefinitions
  ): Promise<{
    tx_blob: string;
    hash: string;
  }> {
    let multisignAddress: boolean | string = false;
    if (typeof multisign === 'string' && multisign.startsWith('X')) {
      multisignAddress = multisign;
    } else if (multisign) {
      multisignAddress = this.classicAddress;
    }

    // clean null & undefined valued tx properties
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- ensure Transaction flows through
    const tx = omitBy(
      { ...transaction },
      (value) => value == null
    ) as unknown as Transaction;

    if (tx.TxnSignature || tx.Signers) {
      throw new ValidationError(
        'txJSON must not contain "TxnSignature" or "Signers" properties'
      );
    }

    this.removeTrailingZeros(tx);

    /*
     * This will throw a more clear error for JS users if the supplied transaction has incorrect formatting
     */
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- validate does not accept Transaction type
    validate(tx as unknown as Record<string, unknown>);

    const txToSignAndEncode = { ...tx };

    txToSignAndEncode.SigningPubKey = multisignAddress ? '' : this.publicKey;

    if (multisignAddress) {
      const signer = {
        Account: multisignAddress,
        SigningPubKey: this.publicKey,
        TxnSignature: await this.computeSignature(
          txToSignAndEncode,
          multisignAddress,
          definitions
        ),
      };
      txToSignAndEncode.Signers = [{ Signer: signer }];
    } else {
      txToSignAndEncode.TxnSignature = await this.computeSignature(
        txToSignAndEncode,
        undefined,
        definitions
      );
    }

    const serialized = encode(txToSignAndEncode);
    return {
      tx_blob: serialized,
      hash: hashSignedTx(serialized),
    };
  }

  /**
   * Verifies a signed transaction offline.
   *
   * @param signedTransaction - A signed transaction (hex string of signTransaction result) to be verified offline.
   * @returns Returns true if a signedTransaction is valid.
   * @throws {Error} Transaction is missing a signature, TxnSignature
   */
  public verifyTransaction(signedTransaction: Transaction | string): boolean {
    return verifySignature(signedTransaction, this.publicKey);
  }

  /**
   * Gets an X-address in Testnet/Mainnet format.
   *
   * @param tag - A tag to be included within the X-address.
   * @param isTestnet - A boolean to indicate if X-address should be in Testnet (true) or Mainnet (false) format.
   * @returns An X-address.
   */
  public getXAddress(tag: number | false = false, isTestnet = false): string {
    return classicAddressToXAddress(this.classicAddress, tag, isTestnet);
  }

  /**
   * Signs a transaction with the proper signing encoding.
   *
   * @param tx - A transaction to sign.
   * @param privateKey - A key to sign the transaction with.
   * @param signAs - Multisign only. An account address to include in the Signer field.
   * Can be either a classic address or an XAddress.
   * @returns A signed transaction in the proper format.
   */
  private async computeSignature(
    tx: Transaction,
    signAs?: string,
    definitions?: XrplDefinitions
  ): Promise<string> {
    if (signAs) {
      const classicAddress = isValidXAddress(signAs)
        ? xAddressToClassicAddress(signAs).classicAddress
        : signAs;

      return this.signWithLit(
        hexToBytes(encodeForMultisigning(tx, classicAddress, definitions))
      );
    }
    return this.signWithLit(hexToBytes(encodeForSigning(tx, definitions)));
  }

  private async signWithLit(message: Uint8Array): Promise<string> {
    const signature = await this.runSign(Sha512.half(message));
    const derhexSig = DER.hexFromSig({
      r: BigInt(signature.r),
      s: BigInt(signature.s),
    });
    return derhexSig.toUpperCase();
  }

  /**
   * Remove trailing insignificant zeros for non-XRP Payment amount.
   * This resolves the serialization mismatch bug when encoding/decoding a non-XRP Payment transaction
   * with an amount that contains trailing insignificant zeros; for example, '123.4000' would serialize
   * to '123.4' and cause a mismatch.
   *
   * @param tx - The transaction prior to signing.
   */
  private removeTrailingZeros(tx: Transaction): void {
    if (
      tx.TransactionType === 'Payment' &&
      typeof tx.Amount !== 'string' &&
      tx.Amount.value.includes('.') &&
      tx.Amount.value.endsWith('0')
    ) {
      // eslint-disable-next-line no-param-reassign -- Required to update Transaction.Amount.value
      tx.Amount = { ...tx.Amount };
      // eslint-disable-next-line no-param-reassign -- Required to update Transaction.Amount.value
      tx.Amount.value = new BigNumber(tx.Amount.value).toString();
    }
  }

  getAddress(): Promise<string> {
    const address = xrpl.deriveAddress(this.pkpBase.compressedPubKey);
    return Promise.resolve(address);
  }
  /**
   * Initializes the PKPXrplWallet instance and its dependencies
   */
  async init(): Promise<void> {
    await this.pkpBase.init();
  }
  /**
   * Runs the specified Lit action with the given parameters.
   *
   * @param {Uint8Array} toSign - The data to be signed by the Lit action.
   * @param {string} sigName - The name of the signature to be returned by the Lit action.
   *
   * @returns {Promise<any>} - A Promise that resolves with the signature returned by the Lit action.
   *
   * @throws {Error} - Throws an error if `pkpPubKey` is not provided, if `controllerAuthSig` or `controllerSessionSigs` is not provided, if `controllerSessionSigs` is not an object, if `executeJsArgs` does not have either `code` or `ipfsId`, or if an error occurs during the execution of the Lit action.
   */
  async runLitAction(toSign: Uint8Array, sigName: string): Promise<any> {
    return this.pkpBase.runLitAction(toSign, sigName);
  }

  /**
   * Sign the provided data with the PKP private key.
   *
   * @param {Uint8Array} toSign - The data to be signed.
   *
   * @returns {Promise<any>} - A Promise that resolves with the signature of the provided data.
   *
   * @throws {Error} - Throws an error if `pkpPubKey` is not provided, if `controllerAuthSig` or `controllerSessionSigs` is not provided, if `controllerSessionSigs` is not an object, or if an error occurs during the signing process.
   */
  async runSign(toSign: Uint8Array): Promise<SigResponse> {
    return this.pkpBase.runSign(toSign);
  }
}
