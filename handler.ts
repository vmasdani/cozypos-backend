import { RouterContext } from "https://deno.land/x/oak@v4.0.0/mod.ts";
import {
  Where, Order, Query
} from "https://deno.land/x/dso@v1.0.0/mod.ts";
import { db } from "./main.ts";
import { ItemTransactionView, TransactionView, ItemStockView, ProjectTransactionsView, ProjectsView, ProjectView, ItemStockInsView } from "./view.ts";
import { Item, ItemTransaction, Transaction, Project, StockIn } from "./model.ts";
import { TransactionPostBody, ItemPostBody, StockInPostBody } from "./postbody.ts";

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
      const itemStockIns = await db.stockIn.findAll(Where.from({ item_id: item.id }));

      // console.log("Item:", item);
      // console.log("Item stockins:", itemStockIns);      

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

export const transactionView = () => {
  return async (ctx: RouterContext) => {
    if(ctx.params.id) {
      const transaction = await db.transaction.findById(ctx.params.id);
      const itemTransactions = await db.itemTransaction.findAll(Where.from({ transaction_id: ctx.params.id }));

      const itemTransactionViews: ItemTransactionView[] = await Promise.all(itemTransactions.map(async (itemTransaction) => {
        const item = await db.item.findById(itemTransaction.itemId ? itemTransaction.itemId : 0);
        
        return {
          itemTransaction: {...itemTransaction} as ItemTransaction,
          item: {...item} as Item
        }
      }));

      console.log("Transaction:", transaction);
      console.log("ItemTransactions:", itemTransactions);
      
      const transactionView: TransactionView = {
        transaction: {...transaction} as Transaction,
        itemTransactions: itemTransactionViews,
        totalPrice: 0
      };

      ctx.response.body = transactionView;
    }
  }
}

export const saveTransaction = () => {
  return async (ctx: RouterContext) => {
    const body: TransactionPostBody = await (await ctx.request.body()).value;

    console.log("Body:", body);

    const transactionId =  await (async () => {
      if(body.transaction.id === 0) {
        return await db.transaction.insert(body.transaction);
      } else {
        return await db.transaction.update(body.transaction);
      }
    })();

    if(transactionId) {
      await Promise.all(
        body.itemTransactions.map(async itemTransactionView => {
          if(itemTransactionView.itemTransaction.id === 0) {
            await db.itemTransaction.insert(itemTransactionView.itemTransaction);
          } else {
            await db.itemTransaction.update(itemTransactionView.itemTransaction);
          }
        })
      );
    }

    await Promise.all(
      body.itemTransactionDeleteIds.map(async id => {
        await db.itemTransaction.delete(Where.from({ id: id }));
      })
    );

    ctx.response.status = 201;
  }
}

export const searchItems = () => {
  return async (ctx: RouterContext) => {
    const name = ctx.request.url.searchParams.get("name");
    console.log("Searching items");
    console.log("Searching items", name);
    
    if(name) {
      const foundItems = (await db.item.findAll(Where.like("name", `%${name}%`))).reverse().slice(0, 10);

      const itemWithStock: ItemStockView[] = await Promise.all (foundItems.map(async (foundItem) => {
        const itemTransactions = await db.itemTransaction.findAll(Where.from({ item_id: foundItem.id }));
        const stockIns = await db.stockIn.findAll(Where.from({ item_id: foundItem.id }));

        const outQty = itemTransactions.reduce((acc, itemTransaction) => acc + (itemTransaction.qty ? itemTransaction.qty : 0), 0);
        const inQty = stockIns.reduce((acc, stockIn) => acc + (stockIn.qty ? stockIn.qty : 0), 0);
      
        return {
          item: {...foundItem} as Item,
          inStock: inQty - outQty
        }
      }));

      ctx.response.body = itemWithStock; 
    } else {
      ctx.response.body = [];
    }
  }
}

export const saveItem = () => {
  return async (ctx: RouterContext) => {
    const itemPostBody: ItemPostBody = await (await ctx.request.body()).value;

    if(itemPostBody.item.id === 0) {
      const newItemId = await db.item.insert(itemPostBody.item);
      
      if(newItemId) {
        if(itemPostBody.withInitialStock) {
          const newStockIn = {
            id: 0,
            qty: itemPostBody.initialStockQty,
            itemId: newItemId
          };

          ctx.response.body = await db.stockIn.insert(newStockIn);
        }
      }
    } else {
      ctx.response.body = await db.item.update(itemPostBody.item);
    }
  }
}

export const getItemStockIns = () => {
  return async (ctx: RouterContext) => {
    if(ctx.params.id) {
      const foundItem = await db.item.findById(ctx.params.id);
      const stockIns = await db.stockIn.findAll(Where.from({ item_id: ctx.params.id }));

      const itemStockInsView: ItemStockInsView = {
        item: foundItem as Item,
        stockIns: stockIns as StockIn[]
      }

      ctx.response.body = itemStockInsView;
    }
  }
}
 
export const postItemStockIns = () => {
  return async (ctx: RouterContext) => {
    const body = await ((await ctx.request.body()).value) as StockInPostBody;

    await Promise.all(
      body.stockIns.map(async stockIn => {
        if(stockIn.id === 0) 
          await db.stockIn.insert({...stockIn, itemId: body.item.id})
        else
          await db.stockIn.update({...stockIn, itemId: body.item.id})
      })
    );
  }
}