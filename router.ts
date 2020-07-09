import { Router, RouterContext } from "https://deno.land/x/oak@v4.0.0/mod.ts";
import {
  Where, BaseModel
} from "https://deno.land/x/dso@v1.0.0/mod.ts";
import { db } from "./main.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.1/mod.ts";
// import { config } from "https://deno.land/x/dotenv@v0.4.1/mod.ts";
import "https://deno.land/x/dotenv@v0.4.1/load.ts";
import { projectTransactionViewHandler, getItemsStock, getProjects, saveTransaction, transactionView, searchItems, saveItem, getItemStockIns, postItemStockIns } from "./handler.ts";

const findAll = (dbModel: BaseModel) => {
  return async (ctx: RouterContext) => {
    const foundRows = (await dbModel.findAll(Where.expr("true"))).reverse();
    ctx.response.body = foundRows;
  }
}

const findOne = (dbModel: BaseModel) => {
  return async (ctx: RouterContext) => {
    if(ctx.params.id) {
      ctx.response.body = await dbModel.findOne(Where.from({ id: ctx.params.id }));
    }
  }
}

const save = (dbModel: BaseModel) => {
  return async (ctx: RouterContext) => {
    const entity = await (await ctx.request.body()).value;
    console.log("Entity:", entity);

    if(entity.id === 0) {
      ctx.response.body = await dbModel.insert(entity);
    } else {
      ctx.response.body = await dbModel.update(entity);
    }
    ctx.response.status = 201;
  }
}

const del = (dbModel: BaseModel) => {
  return async (ctx: RouterContext) => {
    if(ctx.params.id) {
      await dbModel.delete(Where.from({ id: ctx.params.id }))
    }
  }
}

export function route(r: Router) {
  r
    .get("/", (ctx) => {
      ctx.response.body = "Hello world!";
    })
    // Authentication
    .post("/login", async (ctx) => {
      const loginInfo = await (await ctx.request.body()).value;
      const hash = Deno.env.get("PASSWORD");

      if(loginInfo.password && hash) {
        ctx.response.body = await bcrypt.compare(loginInfo.password, hash);
      }
    })
    .get("/generate", async (ctx) => {
      const password = ctx.request.url.searchParams.get("password");
      
      if(password) {
        ctx.response.body = await bcrypt.hash(password);
      } else {
        ctx.response.body = "No password parameter provided!";
      }
    })
    
    // item 
    .get("/items", findAll(db.item))
    .get("/items/:id", findOne(db.item))
    .post("/items", save(db.item))
    .delete("/items/:id", del(db.item))
    
    .get("/items/:id/stockins", getItemStockIns())
    .post("/items/:id/stockins", postItemStockIns())
    .get("/itemstocks", getItemsStock())
    .get("/itemsearch", searchItems())
    .post("/itemsave", saveItem())

    // project
    .get("/projects", findAll(db.project))
    .get("/projects/:id", findOne(db.project))
    .post("/projects", save(db.project))
    .delete("/projects/:id", del(db.project))

    .get("/projects/:id/transactions", projectTransactionViewHandler())
    .get("/projectsview", getProjects())

    // apiKey
    .get("/apikeys", findAll(db.apiKey))

    // itemProject
    .get("/itemprojects", findAll(db.itemProject))
    .get("/itemprojects/:id", findOne(db.itemProject))
    .post("/itemprojects", save(db.itemProject))
    .delete("/itemprojects/:id", del(db.itemProject))

    // transaction
    .get("/transactions", findAll(db.transaction))
    .get("/transactions/:id", findOne(db.transaction))
    .post("/transactions", save(db.transaction))
    .delete("/transactions/:id", del(db.transaction))

    .get("/transactions/view/:id", transactionView())
    .post("/transactionsave", saveTransaction())

    // itemTransaction
    .get("/itemtransactions", findAll(db.itemTransaction))
    .get("/itemtransactions/:id", findOne(db.itemTransaction))
    .post("/itemtransactions", save(db.itemTransaction))
    .delete("/itemtransactions/:id", del(db.itemTransaction))

    // stockIn
    .get("/stockins", findAll(db.stockIn))
    .get("/stockins/:id", findOne(db.stockIn))
    .post("/stockins", save(db.stockIn))
    .delete("/stockins/:id", del(db.stockIn))
}