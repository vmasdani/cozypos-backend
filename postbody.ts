import { Transaction, ItemTransaction, Item } from "./model.ts";
import { ItemTransactionView } from "./view.ts";

export interface TransactionPostBody {
  transaction: Transaction,
  itemTransactions: ItemTransactionView[],
  itemTransactionDeleteIds: number[]
}

export interface ItemPostBody {
  item: Item,
  withInitialStock: boolean,
  initialStockQty: number
}