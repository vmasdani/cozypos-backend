import { Item, Transaction, ItemTransaction, Project, StockIn } from "./model.ts";
import { StockInPostBody } from "./postbody.ts";

export interface ProjectsView {
  projects: ProjectView[],
  totalIncome: number
}

export interface ProjectView {
  project: Project,
  income: number,
  totalManufacturingPrice: number
}

export interface ProjectTransactionsView {
  project: Project,
  transactions: TransactionView[]
}

export interface TransactionView {
  transaction: Transaction,
  itemTransactions: ItemTransactionView[],
  totalPrice: number
}

export interface ItemTransactionView {
  itemTransaction: ItemTransaction,
  item: Item
}

export interface ItemStockView {
  item: Item,
  inStock: number,
}

export interface ItemStockInsView {
  item: Item,
  stockIns: StockIn[]
}