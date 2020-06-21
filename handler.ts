import { RouterContext } from "https://deno.land/x/oak@v4.0.0/mod.ts";
import {
  Where
} from "https://deno.land/x/dso@v1.0.0/mod.ts";
import { db } from "./main.ts";
import { ItemTransactionView, TransactionView, ItemStockView, ProjectTransactionsView, ProjectsView, ProjectView } from "./view.ts";
import { Item, ItemTransaction, Transaction, Project } from "./model.ts";

export const projectTransactionViewHandler = () => {
  return async (ctx: RouterContext) => {
    if (ctx.params.id) {
      const project = await db.project.findOne(Where.from({ id: ctx.params.id }));
      const transactions = await db.transaction.findAll(Where.from({ project_id: project?.id }));

      const transactionViews: TransactionView[] = await Promise.all(transactions.map(async (transaction) => {
        const itemTransactions = await db.itemTransaction.findAll(Where.from({ transaction_id: transaction.id  }));

        const itemTransactionViews: ItemTransactionView[] = await Promise.all(itemTransactions.map(async (itemTransaction) => {
          const item = await db.item.findOne(Where.from({ id: itemTransaction.itemId }));

          return {
            itemTransaction: itemTransaction as ItemTransaction,
            item: item as Item
          }
        }));

        return {
          transaction: transaction as Transaction,
          itemTransactions: itemTransactionViews,
          totalPrice: itemTransactionViews.reduce((acc, itemTransactionView) => {
            const qty = itemTransactionView.itemTransaction.qty ? itemTransactionView.itemTransaction.qty : 0;
            const itemPrice = itemTransactionView.item?.price ? itemTransactionView.item.price : 0
            return acc + qty * itemPrice;
          }, 0)
        }
      }));

      const projectView: ProjectTransactionsView = { 
        project: project as Project,
        transactions: transactionViews.reverse()
      }

      ctx.response.body = projectView;
    }
  };
};

export const getItemsStock = () => {
  return async (ctx: RouterContext) => {
    const items = await db.item.findAll(Where.expr("true"));
    
    const mappedItems: ItemStockView[] = await Promise.all(items.map(async (item) => {
      const itemTransactions = await db.itemTransaction.findAll(Where.from({ item_id: item.id }));
      const itemStockIns = await db.itemStockIn.findAll(Where.from({ item_id: item.id }));

      const soldAmount = itemTransactions.reduce((acc, itemTransaction) => acc - (itemTransaction.qty ? itemTransaction.qty : 0), 0);
      const stockInAmount = itemStockIns.reduce((acc, stockIn) => acc + (stockIn.qty ? stockIn.qty : 0), 0);

      return {
        item: {...item} as Item,
        inStock: stockInAmount - soldAmount 
      }
    }));

    ctx.response.body = mappedItems;
  }
}

export const getProjects = () => {
  return async (ctx: RouterContext) => {
    const projects = await db.project.findAll(Where.expr("true"));

    const projectViews = await Promise.all(projects.map(async (project) => {
      const transactions = await db.transaction.findAll(Where.from({ project_id: project.id }));

      const transactionIncomes = await Promise.all(transactions.map(async (transaction) => {
        const itemTransactions = await db.itemTransaction.findAll(Where.from({ transaction_id: transaction.id }));
        
        const itemTransactionIncomes = await Promise.all(itemTransactions.map(async (itemTransaction) => {
          const item = await db.item.findById(itemTransaction.id ? itemTransaction.id : 0);
          
          const itemPrice = item?.price ? item.price : 0;
          const itemTransactionQty = itemTransaction.qty ? itemTransaction.qty : 0;

          return itemPrice * itemTransactionQty;
        }));

        return itemTransactionIncomes.reduce((acc, income) => acc + income, 0);
      }));

      const projectIncome = transactionIncomes.reduce((acc, income) => acc + income, 0);
    
      const projectView: ProjectView = {
        project: {...project} as Project,
        income: projectIncome,
        totalManufacturingPrice: 0
      }

      return projectView;
    }));

    const projectViewsFinal: ProjectsView = {
      projects: [...projectViews].reverse(),
      totalIncome: projectViews.reduce((acc, projectView) => acc + projectView.income, 0)
    };
    ctx.response.body = projectViewsFinal;
  }
}