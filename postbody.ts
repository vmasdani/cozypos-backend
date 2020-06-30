import { Transaction, ItemTransaction, Item } from "./model.ts";

export interface TransactionPostBody {
  transaction: Transaction,
  itemTransactions: ItemTransaction[],
  itemTransactionDeleteIds: number[]
}

export interface ItemPostBody {
  item: Item,
  withInitialStock: boolean,
  initialStockQty: number
}