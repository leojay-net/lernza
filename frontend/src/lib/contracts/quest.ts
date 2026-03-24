import { 
  Address, 
  Contract, 
  nativeToScVal, 
  scValToNative, 
  SorobanRpc, 
  xdr,
  TransactionBuilder,
  Asset
} from "@stellar/stellar-sdk";
import { server, signAndSubmit, NETWORK_PASSPHRASE } from "./client";

const CONTRACT_ID = import.meta.env.VITE_QUEST_CONTRACT_ID || "";

export interface QuestInfo {
  id: number;
  owner: string;
  name: string;
  description: string;
  tokenAddr: string;
  createdAt: number;
}

export class QuestClient {
  private contract: Contract;

  constructor() {
    this.contract = new Contract(CONTRACT_ID);
  }

  // --- Read Operations ---

  async getQuest(questId: number): Promise<QuestInfo | null> {
    const scQuest = await server.getContractData({
      contractId: CONTRACT_ID,
      key: xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol("Quest"),
        nativeToScVal(questId, { type: "u32" })
      ]),
      durability: "persistent"
    });
    
    if (scQuest.results[0]?.result) {
       const native = scValToNative(scQuest.results[0].result);
       return {
         id: native.id,
         owner: native.owner,
         name: native.name,
         description: native.description,
         tokenAddr: native.token_addr,
         createdAt: Number(native.created_at)
       };
    }
    return null;
  }

  async getQuestCount(): Promise<number> {
    const result = await this.invokeRead("get_quest_count", []);
    return result ? Number(result) : 0;
  }

  async getEnrollees(questId: number): Promise<string[]> {
    const result = await this.invokeRead("get_enrollees", [
      nativeToScVal(questId, { type: "u32" })
    ]);
    return result || [];
  }

  async isEnrollee(questId: number, user: string): Promise<boolean> {
     const result = await this.invokeRead("is_enrollee", [
       nativeToScVal(questId, { type: "u32" }),
       new Address(user).toScVal()
     ]);
     return !!result;
  }

  // --- Write Operations ---

  async createQuest(owner: string, name: string, description: string, tokenAddr: string) {
    const tx = await this.buildTx(owner, "create_quest", [
      new Address(owner).toScVal(),
      nativeToScVal(name, { type: "string" }),
      nativeToScVal(description, { type: "string" }),
      new Address(tokenAddr).toScVal()
    ]);
    return signAndSubmit(tx);
  }

  async addEnrollee(owner: string, questId: number, enrollee: string) {
    const tx = await this.buildTx(owner, "add_enrollee", [
      nativeToScVal(questId, { type: "u32" }),
      new Address(enrollee).toScVal()
    ]);
    return signAndSubmit(tx);
  }

  // --- Private Helpers ---

  private async invokeRead(method: string, args: xdr.ScVal[]) {
    try {
      const response = await server.simulateTransaction({
        transaction: TransactionBuilder.build({
          args,
          function: method,
          contractId: CONTRACT_ID,
          networkPassphrase: NETWORK_PASSPHRASE,
          source: Keypair.random().publicKey() // random source for simulation
        })
      });
      
      if (response && "result" in response) {
         return scValToNative(response.result!.retval);
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

export const questClient = new QuestClient();
