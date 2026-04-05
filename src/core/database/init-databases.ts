import { JsonDatabase } from "@/database/database-types.js"
import { AccountsDatabase } from "@/features/accounts/database/accounts-type.js"
import { CurrenciesDatabase } from "@/features/currencies/database/currencies-types.js"
import { ItemRawSchema } from "@/features/items/schemas/items-schemas.js"
import { ShopsDatabase } from "@/features/shops/database/shops-types.js"
import { NanoIdSchema } from "@/schemas/utils.js"
import fs from "fs/promises"

const accountsDatabasePath = "./data/accounts.json"
const currenciesDatabasePath = "./data/currencies.json"
const shopsDatabasePath = "./data/shops.json"
const itemsDatabasePath = "./data/items.json"

const accountsDatabaseRaw = JSON.parse(await fs.readFile(accountsDatabasePath, "utf-8"))
const currenciesDatabaseRaw = JSON.parse(await fs.readFile(currenciesDatabasePath, "utf-8"))
const shopsDatabaseRaw = JSON.parse(await fs.readFile(shopsDatabasePath, "utf-8"))
const itemsDatabaseRaw = JSON.parse(await fs.readFile(itemsDatabasePath, "utf-8"))

// const accountsDatabase = new JsonDatabase(accountsDatabaseRaw, accountsDatabasePath, AccountRawSchema, SnowflakeSchema)
// const currenciesDatabase = new JsonDatabase(currenciesDatabaseRaw, currenciesDatabasePath, CurrencyRawSchema, NanoIdSchema)
// const shopsDatabase = new JsonDatabase(shopsDatabaseRaw, shopsDatabasePath, ShopRawSchema, NanoIdSchema)
const itemsDatabase = new JsonDatabase(itemsDatabaseRaw, itemsDatabasePath, ItemRawSchema, NanoIdSchema)

// legacy (for now order matters because hydration happens inside the db classes, after the refactor this will be fixed, hydration will be on demand)
const currenciesDatabase = new CurrenciesDatabase(currenciesDatabaseRaw, "data/currencies.json")
const shopsDatabase = new ShopsDatabase(shopsDatabaseRaw, "data/shops.json")
const accountsDatabase = new AccountsDatabase(accountsDatabaseRaw, "data/accounts.json")


export { accountsDatabase, currenciesDatabase, itemsDatabase, shopsDatabase }
