import {
  BaseModel,
  Model,
  Field,
  FieldType
} from "https://deno.land/x/dso@v1.0.0/mod.ts";

@Model("api_key")
export class ApiKey extends BaseModel {
  @Field({
    type: FieldType.INT,
    primary: true,
    length: 11,
    autoIncrement: true
  })
  id!: number;

  @Field({ type: FieldType.STRING, default: "''" })
  apiKey?: string;
}

@Model("item")
export class Item extends BaseModel {
  @Field({
    type: FieldType.INT,
    primary: true,
    length: 11,
    autoIncrement: true
  })
  id!: number;

  @Field({ type: FieldType.STRING, default: "''" })
  uid?: string;

  @Field({ type: FieldType.STRING, default: "''" })
  name?: string;

  @Field({ type: FieldType.STRING, default: "''" })
  description?: string;

  @Field({ type: FieldType.INT, default: 0 })
  price?: number;

  @Field({ type: FieldType.INT, default: 0 })
  manufacturingPrice?: number;
}

@Model("project")
export class Project extends BaseModel {
  @Field({
    type: FieldType.INT,
    primary: true,
    length: 11,
    autoIncrement: true
  })
  id!: number;

  @Field({ type: FieldType.STRING, default: "''" })
  uid?: string;

  @Field({ type: FieldType.STRING, default: "''" })
  name?: string;

  @Field({ type: FieldType.DATE, default: "'2000-01-01'" })
  startDate?: string;
}

@Model("transaction")
export class Transaction extends BaseModel {
  @Field({
    type: FieldType.INT,
    primary: true,
    length: 11,
    autoIncrement: true
  })
  id!: number;

  @Field({ type: FieldType.STRING, default: "''" })
  uid?: string;

  @Field({ type: FieldType.STRING, default: "''" })
  cashier?: string;

  @Field({ type: FieldType.BOOLEAN, default: false })
  priceIsCustom?: boolean; 

  @Field({ type: FieldType.INT, default: 0 })
  customPrice?: number;

  @Field({ type: FieldType.INT, default: 0 })
  projectId?: number;
}

@Model("stock_in")
export class StockIn extends BaseModel {
  @Field({
    type: FieldType.INT,
    primary: true,
    length: 11,
    autoIncrement: true
  })
  id!: number;

  @Field({ type: FieldType.STRING, default: "''" })
  uid?: string;

  @Field({ type: FieldType.STRING, default: "''" })
  pic?: string;

  @Field({ type: FieldType.INT, notNull: true })
  itemId!: number;

  // @Field({ type: FieldType.INT, notNull: true })
  // projectId!: number;

  @Field({ type: FieldType.INT, default: 0 })
  qty?: number;
}

@Model("item_transaction")
export class ItemTransaction extends BaseModel {
  @Field({
    type: FieldType.INT,
    primary: true,
    length: 11,
    autoIncrement: true
  })
  id!: number;

  @Field({ type: FieldType.STRING, default: "''" })
  uid?: string;

  @Field({ type: FieldType.INT, notNull: true })
  itemId!: number;

  @Field({ type: FieldType.INT, notNull: true })
  transactionId!: number;

  @Field({ type: FieldType.INT, default: 0 })
  qty?: number;
}

@Model("item_stock_in")
export class ItemStockIn extends BaseModel {
  @Field({
    type: FieldType.INT,
    primary: true,
    length: 11,
    autoIncrement: true
  })
  id!: number;

  @Field({ type: FieldType.STRING, default: "''" })
  uid?: string;

  @Field({ type: FieldType.INT, notNull: true })
  itemId!: number;

  @Field({ type: FieldType.INT, notNull: true })
  stockInId!: number;

  @Field({ type: FieldType.INT, default: 0 })
  qty?: number;
}

@Model("item_project")
export class ItemProject extends BaseModel {
  @Field({
    type: FieldType.INT,
    primary: true,
    length: 11,
    autoIncrement: true
  })
  id!: number;

  @Field({ type: FieldType.STRING, default: "''" })
  uid?: string;

  @Field({ type: FieldType.INT, notNull: true })
  itemId!: number;

  @Field({ type: FieldType.INT, notNull: true })
  projectId!: number;

  @Field({ type: FieldType.INT, default: 0 })
  qty?: number;
}