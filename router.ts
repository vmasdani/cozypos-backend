import { Router, RouterContext } from "https://deno.land/x/oak@v6.0.1/mod.ts";
import {
  Where, BaseModel
} from "https://deno.land/x/dso@v1.0.0/mod.ts";
import { db } from "./main.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.1/mod.ts";
// import { config } from "https://deno.land/x/dotenv@v0.4.1/mod.ts";
import "https://deno.land/x/dotenv@v0.4.1/load.ts";
import { 
  projectTransactionViewHandler, 
  getItemsStock, 
  getProjects, 
  saveTransaction, 
  transactionView, 
  searchItems, 
  saveItem, 
  getItemStockIns, 
  postItemStockIns, 
  getTransactionsCsv, 
  populate, 
  addItemStockIns
} from "./handler.ts";
import * as base64 from "https://deno.land/x/base64@v0.2.0/mod.ts";

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
    // console.log("Entity:", entity);

    if(entity.id === 0) {
      ctx.response.body = { id: await dbModel.insert(entity) };
    } else {
      await dbModel.update(entity);
      ctx.response.body = { id: entity.id }
    }
    ctx.response.status = 201;
  }
}

const del = (dbModel: BaseModel) => {
  return async (ctx: RouterContext) => {
    // console.log("DELETE with id:", ctx.params.id);

    if(ctx.params.id) {
      await dbModel.delete(Where.from({ id: ctx.params.id }));
      
      ctx.response.body = ctx.params.id;
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
      const loginInfo = await ctx.request.body({ type: "json" }).value;
      const hash = Deno.env.get("PASSWORD");

      // console.log("Login info & pw hash:", loginInfo, hash);

      if(loginInfo.password && hash) {
        const match = await bcrypt.compare(loginInfo.password, hash);
        
        const username =  loginInfo.username ? loginInfo.username : "";
        const usernameBase64 = base64.fromUint8Array(new TextEncoder().encode(username));
        const ts = await bcrypt.hash(`${new Date().getTime()}`);

        const apiKey = `${usernameBase64}:${ts}`;

        // Replace API key
        const foundApiKey = await db.apiKey.findOne(Where.like("api_key", `${usernameBase64}%`));

        // console.log("Found api key:", foundApiKey);

        if(foundApiKey) {
          await db.apiKey.update({ id: foundApiKey.id, apiKey: apiKey });
        } else {
          await db.apiKey.insert({ id: 0, apiKey: apiKey });
        }
    
        if(match) {
          ctx.response.body = apiKey;
          ctx.response.status = 200;
        } else {
          ctx.response.status = 500;
          ctx.response.body = "Password does not match.";
        }
      } else {
        ctx.response.status = 500; 
        ctx.response.body = "Password empty or unknown error.";
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
    .post("/items/:id/stockinsadd", addItemStockIns())
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
    .get("/transactioncsv", getTransactionsCsv())

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

    // populate
    .get("/populate", populate())
}