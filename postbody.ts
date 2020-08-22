import { Transaction, ItemTransaction, Item, StockIn, Project } from "./model.ts";
import { ItemTransactionView } from "./view.ts";

export interface TransactionPostBody {
  transaction: Transaction,
  itemTransactions: ItemTransactionView[],
  itemTransactionDeleteIds: number[]
}

export interface ItemPostBody {
  item: Item,
  withInitialStock: boolean,
  initialStockQty: number,
  project: Project | null
}

export interface StockInPostBody {
  item: Item, 
  stockIns: StockIn[]
}