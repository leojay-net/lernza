import { 
  rpc, 
  networks, 
  Transaction, 
  TransactionBuilder, 
  xdr,
  SorobanRpc,
  Keypair,
  Address
} from "@stellar/stellar-sdk";
import { 
  isConnected, 
  getPublicKey, 
  signTransaction 
} from "@stellar/freighter-api";

export const SOROBAN_RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE || networks.TESTNET;

export const server = new rpc.Server(SOROBAN_RPC_URL);

export interface TransactionResult {
  status: "SUCCESS" | "FAILED" | "PENDING";
  txHash: string;
  resultXdr?: string;
  error?: string;
}

/**
 * Common helper to wait for transaction completion
 */
export async function pollTransaction(txHash: string): Promise<SorobanRpc.GetTransactionResponse> {
  let response = await server.getTransaction(txHash);
  
  while (response.status === SorobanRpc.GetTransactionStatus.NOT_FOUND) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    response = await server.getTransaction(txHash);
  }
  
  return response;
}

/**
 * Signs and submits a transaction using Freighter
 */
export async function signAndSubmit(tx: Transaction): Promise<TransactionResult> {
  try {
    const signedTxXdr = await signTransaction(tx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    
    const submitResponse = await server.sendTransaction(new Transaction(signedTxXdr, NETWORK_PASSPHRASE));
    
    if (submitResponse.status === "PENDING" || submitResponse.status === "SUCCESS") {
      const pollResponse = await pollTransaction(submitResponse.hash);
      
      if (pollResponse.status === SorobanRpc.GetTransactionStatus.SUCCESS) {
        return {
          status: "SUCCESS",
          txHash: submitResponse.hash,
          resultXdr: pollResponse.resultXdr,
        };
      } else {
        return {
          status: "FAILED",
          txHash: submitResponse.hash,
          error: "Transaction failed after submission",
        };
      }
    } else {
      return {
        status: "FAILED",
        txHash: submitResponse.hash,
        error: submitResponse.errorResultXdr || "Submission failed",
      };
    }
  } catch (err: any) {
    console.error("Transaction submission error:", err);
    return {
      status: "FAILED",
      txHash: "",
      error: err.message || "Unknown error during signing/submission",
    };
  }
}
