import { Item, Transaction, ItemTransaction, Project } from "./model.ts";

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