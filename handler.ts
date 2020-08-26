import { RouterContext } from "https://deno.land/x/oak@v6.0.1/mod.ts";
import {
  Where, Order, Query
} from "https://deno.land/x/dso@v1.0.0/mod.ts";
import { db } from "./main.ts";
import { ItemTransactionView, TransactionView, ItemStockView, ProjectTransactionsView, ProjectsView, ProjectView, ItemStockInsView, StockInView } from "./view.ts";
import { Item, ItemTransaction, Transaction, Project, StockIn, ItemStockIn } from "./model.ts";
import { TransactionPostBody, ItemPostBody, StockInPostBody } from "./postbody.ts";
import { readCSV, readCSVObjects } from "https://deno.land/x/csv@v0.4.0/mod.ts";
import { v4 } from "https://deno.land/std@v0.63.0/uuid/mod.ts";

export const projectTransactionViewHandler = () => {
  return async (ctx: RouterContext) => {
    if (ctx.params.id) {
      const project = await db.project.findOne(Where.from({ id: ctx.params.id }));
      const transactions = await db.transaction.findAll(Where.from({ project_id: project?.id }));

      const transactionViews: TransactionView[] = await Promise.all(transactions.map(async (transaction) => {
        const itemTransactions = await db.itemTransaction.findAll(Where.from({ transaction_id: transaction.id }));

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

      const soldAmount = itemTransactions.reduce((acc, itemTransaction) => acc + (itemTransaction.qty ? itemTransaction.qty : 0), 0);
      const stockInAmount = itemStockIns.reduce((acc, stockIn) => acc + (stockIn.qty ? stockIn.qty : 0), 0);

      return {
        item: item as Item,
        inStock: stockInAmount - soldAmount
      }
    }));

    ctx.response.body = mappedItems.reverse();
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
          const item = await db.item.findById(itemTransaction.itemId ? itemTransaction.itemId : 0);

          const itemPrice = item?.price ? item.price : 0;
          const itemTransactionQty = itemTransaction.qty ? itemTransaction.qty : 0;

          // console.log("ItemTransaction id:", itemTransaction.id,  "Item ID:", item?.id, item?.name, itemTransactionQty)

          return itemPrice * itemTransactionQty;
        }));

        const finalPrice = transaction.priceIsCustom
          ? transaction.customPrice ? transaction.customPrice : 0
          : itemTransactionIncomes.reduce((acc, income) => acc + income, 0);

        // console.log(finalPrice);
        return finalPrice;
      }));

      const projectIncome = transactionIncomes.reduce((acc, income) => acc + income, 0);

      const projectView: ProjectView = {
        project: project as Project,
        income: projectIncome,
        totalManufacturingPrice: 0
      }

      return projectView;
    }));

    const projectViewsFinal: ProjectsView = {
      projects: [...projectViews].reverse(),
      totalIncome: projectViews.reduce((acc, projectView) => acc + projectView.income, 0)
    };

    // console.log("project view final:", projectViewsFinal);

    ctx.response.body = projectViewsFinal;
  }
}

export const transactionView = () => {
  return async (ctx: RouterContext) => {
    if (ctx.params.id) {
      const transaction = await db.transaction.findById(ctx.params.id);
      const itemTransactions = await db.itemTransaction.findAll(Where.from({ transaction_id: ctx.params.id }));

      const itemTransactionViews: ItemTransactionView[] = await Promise.all(itemTransactions.map(async (itemTransaction) => {
        const item = await db.item.findById(itemTransaction.itemId ? itemTransaction.itemId : 0);

        return {
          itemTransaction: itemTransaction as ItemTransaction,
          item: item as Item
        }
      }));

      // console.log("Transaction:", transaction);
      // console.log("ItemTransactions:", itemTransactions);

      const transactionView: TransactionView = {
        transaction: transaction as Transaction,
        itemTransactions: itemTransactionViews,
        totalPrice: 0
      };

      ctx.response.body = transactionView;
    }
  }
}

export const saveTransaction = () => {
  return async (ctx: RouterContext) => {
    const body: TransactionPostBody = await ctx.request.body({ type: "json" }).value;

    // console.log("Body:", body);
    const cashierName = ctx.request.headers.get("cashier");
    // console.log("Cashier:", cashierName);

    const transactionId = await (async () => {
      if (body.transaction.id === 0) {
        return await db.transaction.insert({...body.transaction, cashier: cashierName ? cashierName : "" });
      } else {
        try {
          await db.transaction.update({...body.transaction, cashier: cashierName ? cashierName : ""});
        } catch(e) {
          console.error(e);
        }
        return body.transaction.id;
      }
    })();

    // console.log("Saved transaction ID:", transactionId);

    if (transactionId) {
      await Promise.all(
        body.itemTransactions.map(async itemTransactionView => {
          // console.log("item transaction view: ", itemTransactionView);

          const itemTransactionWithTransactionId = {
            ...itemTransactionView.itemTransaction,
            transactionId: transactionId
          };

          // console.log("With transaction id:", itemTransactionWithTransactionId);

          if (itemTransactionView.itemTransaction.id === 0) {
            await db.itemTransaction.insert(itemTransactionWithTransactionId);
          } else {
            await db.itemTransaction.update(itemTransactionWithTransactionId);
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
    ctx.response.body = { id: transactionId };
  }
}

// export const searchItemD = () => {

// }

export const searchItems = () => {
  return async (ctx: RouterContext) => {
    const name = ctx.request.url.searchParams.get("name");
    // console.log("Searching items");
    // console.log("Searching items", name);

    if (name) {
      const foundItems = (await db.item.findAll(Where.like("name", `%${name}%`))).reverse().slice(0, 10);

      const itemWithStock: ItemStockView[] = await Promise.all(foundItems.map(async (foundItem) => {
        const itemTransactions = await db.itemTransaction.findAll(Where.from({ item_id: foundItem.id }));
        const stockIns = await db.stockIn.findAll(Where.from({ item_id: foundItem.id }));

        const outQty = itemTransactions.reduce((acc, itemTransaction) => acc + (itemTransaction.qty ? itemTransaction.qty : 0), 0);
        const inQty = stockIns.reduce((acc, stockIn) => acc + (stockIn.qty ? stockIn.qty : 0), 0);

        return {
          item: foundItem as Item,
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
    // console.log("Saving item");
    const itemPostBody = await ctx.request.body({ type: "json" }).value as ItemPostBody;

    // console.log("itempost body", itemPostBody);

    if (itemPostBody?.item.id === 0) {
      try {
        const newItemId = await db.item.insert(itemPostBody.item);

        if (newItemId) {
          if (itemPostBody.withInitialStock) {
            const newStockIn = {
              id: 0,
              qty: itemPostBody.initialStockQty,
              itemId: newItemId,
              projectId: itemPostBody.project?.id
            };

            await db.stockIn.insert(newStockIn);
          }

          ctx.response.body = newItemId;
        }
      } catch (e) {
        console.error(e)
      }

    } else {
      await db.item.update(itemPostBody.item);
      ctx.response.body = itemPostBody.item.id;
    }
  }
}

export const getItemStockIns = () => {
  return async (ctx: RouterContext) => {
    if (ctx.params.id) {
      const foundItem = await db.item.findById(ctx.params.id);
      const stockIns = await db.stockIn.findAll(Where.from({ item_id: ctx.params.id }));

      const itemStockInsView = {
        item: foundItem as Item,
        stockIns: (await Promise.all(stockIns.map(async stockIn => {
          const foundProject = await db.project.findById(stockIn.projectId ? stockIn.projectId : 0);

          return {
            project: (foundProject ? foundProject : null) as null | Project,
            stockIn: stockIn as StockIn
          }
        }))).reverse() as StockInView[]
      };

      ctx.response.body = itemStockInsView;
    }
  }
}

export const postItemStockIns = () => { // Unused
  return async (ctx: RouterContext) => {
    const body: StockInPostBody = await ctx.request.body({ type: "json" }).value;

    await Promise.all(
      body.stockIns.map(async stockIn => {
        if (stockIn.id === 0)
          await db.stockIn.insert({ ...stockIn, itemId: body.item.id })
        else
          await db.stockIn.update({ ...stockIn, itemId: body.item.id })
      })
    );
  }
}

export const addItemStockIns = () => { // Used
  return async (ctx: RouterContext) => {
    const body: StockIn = await ctx.request.body({ type: "json" }).value;

    await db.stockIn.insert({ ...body });
    // await Promise.all(
    //   body.stockIns.map(async stockIn => {
    //     if (stockIn.id === 0)
    //       await db.stockIn.insert({ ...stockIn, itemId: body.item.id })
    //     else
    //       await db.stockIn.update({ ...stockIn, itemId: body.item.id })
    //   })
    // );

    ctx.response.status = 201;
  }
}

export const getTransactionsCsv = () => {
  return async (ctx: RouterContext) => {

  }
}

export const populate = () => {
  return async (ctx: RouterContext) => {
    // Create project
    console.log("Populating project");
    const projectId = await db.project.insert({
      id: 0,
      uid: "",
      name: "CF14",
      startDate: "2020-02-23"
    });

    // Items
    console.log("Populating item");
    const itemsCsv = await Deno.open("./csv/items.csv");

    for await (const obj of readCSVObjects(itemsCsv)) {
      const item = {
        id: 0,
        uid: `item-${obj.id}`,
        name: obj.name,
        description: obj.desc,
        price: Number(obj.price),
        manufacturing_price: Number(obj.manufacturing_price)
      };

      await db.item.insert(item);
    }

    // Stock ins
    console.log("Populating stock in");
    try {
      const stockInsCsv = await Deno.open("./csv/itemstockins.csv");

      for await (const obj of readCSVObjects(stockInsCsv)) {
        const foundItem = await db.item.findOne(Where.from({ uid: `item-${obj.item_id}` }));

        const stockIn = {
          id: 0,
          uid: `stockin-${obj.id}`,
          itemId: foundItem ? foundItem.id : 0,
          pic: obj.pic,
          qty: Number(obj.qty),
          project_id: projectId
        };

        await db.stockIn.insert(stockIn);
      }
    } catch (e) {
      console.error(e);
    }


    // Transactions
    console.log("Populating transaction");
    const transactionsCsv = await Deno.open("./csv/transactions.csv");

    for await (const obj of readCSVObjects(transactionsCsv)) {
      const transaction = {
        id: 0,
        uid: `transaction-${obj.id}`,
        cashier: obj.cashier,
        priceIsCustom: obj.custom_price === "1" || obj.custom_price !== "0",
        customPrice: obj.custom_price === "1" || obj.custom_price !== "0" ? Number(obj.custom_price) : 0,
        projectId: projectId
      };

      // console.log(obj);
      await db.transaction.insert(transaction);
    }

    // Item transactions
    console.log("Populating Item transaction");
    const itemTransactionsCsv = await Deno.open("./csv/itemtransactions.csv");

    for await (const obj of readCSVObjects(itemTransactionsCsv)) {
      const foundTransaction = await db.transaction.findOne(Where.from({ uid: `transaction-${obj.transaction_id}` }));
      const foundItem = await db.item.findOne(Where.from({ uid: `item-${obj.item_id}` }));

      const itemTransaction = {
        id: 0,
        uid: `itemtransaction-${obj.id}`,
        itemId: foundItem ? foundItem.id : 0,
        transactionId: foundTransaction ? foundTransaction.id : 0,
        qty: Number(obj.qty)
      };
      // console.log(itemTransaction);
      // console.log("Found transaction:", foundTransaction);
      // console.log("Found item: ", foundItem);

      await db.itemTransaction.insert(itemTransaction);
    }

    console.log("Population successful!");
    ctx.response.body = "Population successful!";
  }
}