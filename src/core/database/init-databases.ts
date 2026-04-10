import { JsonDatabase } from "@/database/database-types.js"
import { AccountRawSchema } from "@/features/accounts/schemas/accounts-schemas.js"
import { CurrencyRawSchema } from "@/features/currencies/schemas/currencies-schemas.js"
import { ItemRawSchema } from "@/features/items/schemas/items-schemas.js"
import { ShopRawSchema } from "@/features/shops/schemas/shop-schemas.js"
import { NanoIdSchema, SnowflakeSchema } from "@/schemas/utils.js"
import fs from "fs/promises"

const accountsDatabasePath = "./data/accounts2.json"
const currenciesDatabasePath = "./data/currencies2.json"
const shopsDatabasePath = "./data/shops2.json"
const itemsDatabasePath = "./data/items.json"

const accountsDatabaseRaw = JSON.parse(await fs.readFile(accountsDatabasePath, "utf-8"))
const currenciesDatabaseRaw = JSON.parse(await fs.readFile(currenciesDatabasePath, "utf-8"))
const shopsDatabaseRaw = JSON.parse(await fs.readFile(shopsDatabasePath, "utf-8"))
const itemsDatabaseRaw = JSON.parse(await fs.readFile(itemsDatabasePath, "utf-8"))

const accountsDatabase = new JsonDatabase(accountsDatabaseRaw, accountsDatabasePath, AccountRawSchema, SnowflakeSchema)
const currenciesDatabase = new JsonDatabase(currenciesDatabaseRaw, currenciesDatabasePath, CurrencyRawSchema, NanoIdSchema)
const shopsDatabase = new JsonDatabase(shopsDatabaseRaw, shopsDatabasePath, ShopRawSchema, NanoIdSchema)
const itemsDatabase = new JsonDatabase(itemsDatabaseRaw, itemsDatabasePath, ItemRawSchema, NanoIdSchema)

export { accountsDatabase, currenciesDatabase, itemsDatabase, shopsDatabase }

// const HYDRATOR = new Hydrator(currenciesDatabase, itemsDatabase, shopsDatabase, accountsDatabase)

// export { HYDRATOR }