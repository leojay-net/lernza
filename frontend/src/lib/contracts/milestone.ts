import { 
  Address, 
  Contract, 
  nativeToScVal, 
  scValToNative, 
  SorobanRpc, 
  xdr,
  TransactionBuilder,
  Asset,
  Keypair
} from "@stellar/stellar-sdk";
import { server, signAndSubmit, NETWORK_PASSPHRASE } from "./client";

const CONTRACT_ID = import.meta.env.VITE_MILESTONE_CONTRACT_ID || "";

export interface MilestoneInfo {
  id: number;
  questId: number;
  title: string;
  description: string;
  rewardAmount: bigint;
}

export class MilestoneClient {
  private contract: Contract;

  constructor() {
    this.contract = new Contract(CONTRACT_ID);
  }

  // --- Read Operations ---

  async getMilestone(questId: number, milestoneId: number): Promise<MilestoneInfo | null> {
    const result = await this.invokeRead("get_milestone", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" })
    ]);
    return result || null;
  }

  async getMilestones(questId: number): Promise<MilestoneInfo[]> {
    const result = await this.invokeRead("get_milestones", [
      nativeToScVal(questId, { type: "u32" })
    ]);
    return result || [];
  }

  async getMilestoneCount(questId: number): Promise<number> {
    const result = await this.invokeRead("get_milestone_count", [
      nativeToScVal(questId, { type: "u32" })
    ]);
    return result ? Number(result) : 0;
  }

  async isCompleted(questId: number, milestoneId: number, user: string): Promise<boolean> {
    const result = await this.invokeRead("is_completed", [
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(user).toScVal()
    ]);
    return !!result;
  }

  async getEnrolleeCompletions(questId: number, enrollee: string): Promise<number> {
    const result = await this.invokeRead("get_enrollee_completions", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(enrollee).toScVal()
    ]);
    return result ? Number(result) : 0;
  }

  // --- Write Operations ---

  async createMilestone(owner: string, questId: number, title: string, description: string, rewardAmount: bigint) {
    const tx = await this.buildTx(owner, "create_milestone", [
      new Address(owner).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(title, { type: "string" }),
      nativeToScVal(description, { type: "string" }),
      nativeToScVal(rewardAmount, { type: "i128" })
    ]);
    return signAndSubmit(tx);
  }

  async verifyCompletion(owner: string, questId: number, milestoneId: number, enrollee: string) {
    const tx = await this.buildTx(owner, "verify_completion", [
      new Address(owner).toScVal(),
      nativeToScVal(questId, { type: "u32" }),
      nativeToScVal(milestoneId, { type: "u32" }),
      new Address(enrollee).toScVal()
    ]);
    return signAndSubmit(tx);
  }

  // --- Private Helpers ---

  private async invokeRead(method: string, args: xdr.ScVal[]) {
    try {
      const resp = await server.simulateTransaction({
        transaction: TransactionBuilder.build({
          args,
          function: method,
          contractId: CONTRACT_ID,
          networkPassphrase: NETWORK_PASSPHRASE,
          source: Keypair.random().publicKey() 
        })
      });
      
      if (resp && "result" in resp && resp.result) {
         return scValToNative(resp.result.retval);
      }
    } catch (e) {
      console.error(`Read error ${method}:`, e);
    }
    return null;
  }

  private async buildTx(source: string, method: string, args: xdr.ScVal[]) {
     const op = this.contract.call(method, ...args);
     const account = await server.getAccount(source);
     
     const tx = new TransactionBuilder(account, {
       fee: "100",
       networkPassphrase: NETWORK_PASSPHRASE
     })
     .addOperation(op)
     .setTimeout(30)
     .build();
     
     return await server.prepareTransaction(tx);
  }
}

export const milestoneClient = new MilestoneClient();
