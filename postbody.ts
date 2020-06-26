import { Transaction, ItemTransaction } from "./model.ts";

export interface TransactionPostBody {
  transaction: Transaction,
  itemTransactions: ItemTransaction[],
  itemTransactionDeleteIds: number[]
}