import {
  dso
} from "https://deno.land/x/dso@v1.0.0/mod.ts";
import { Application, Router } from "https://deno.land/x/oak@v6.0.1/mod.ts";
import { ApiKey, Item, Project, ItemProject, Transaction, ItemTransaction, StockIn, ItemStockIn } from "./model.ts";
import { route } from "./router.ts";
import "https://deno.land/x/dotenv@v0.5.0/load.ts";
import { oakCors } from "https://deno.land/x/cors@v1.1.0/mod.ts";

const dbName = Deno.env.get("DB_NAME");
const host = Deno.env.get("DB_HOST");
const username = Deno.env.get("DB_USERNAME");
const password = Deno.env.get("DB_PASSWORD");

export const db = {
  apiKey: dso.define(ApiKey),
  item: dso.define(Item),
  project: dso.define(Project),
  itemProject: dso.define(ItemProject),
  itemStockIn: dso.define(ItemStockIn),
  transaction: dso.define(Transaction),
  itemTransaction: dso.define(ItemTransaction),
  stockIn: dso.define(StockIn)
};

await dso.connect({
  hostname: host,
  port: 3306,
  username: username,
  password: password,
  db: dbName
});

await dso.sync(false);

async function startOak() {
  const app = new Application();
  const r = new Router();

  route(r);

  app.use(oakCors({
    origin: "*",
    allowedHeaders: "*",
    methods: "*"
  }));
  app.use(r.routes());
  app.use(r.allowedMethods());

  console.log("Starting application on port 8080");
  await app.listen({ port: 8080 });
}

startOak();