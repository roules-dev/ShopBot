import { JsonDatabase } from "@/database/json-database.js"
import { AccountRawSchema } from "@/features/accounts/schemas/accounts.schemas.js"
import { CurrencyRawSchema } from "@/features/currencies/schemas/currencies.schemas.js"
import { ItemRawSchema } from "@/features/items/schemas/items.schemas.js"
import { ShopRawSchema } from "@/features/shops/schemas/shop.schemas.js"
import { REQUIRED_DB_VERSION } from "@/global-settings.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { NanoIdSchema, SnowflakeSchema } from "@/schemas/utils.js"
import { getDbVersion } from "@/tools/migrate-db-to-v3.js"
import fs from "fs/promises"
import { Hydrator } from "./hydrator.js"

checkDbVersion()

const accountsDatabasePath = "./data/accounts.json"
const currenciesDatabasePath = "./data/currencies.json"
const shopsDatabasePath = "./data/shops.json"
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

const HYDRATOR = new Hydrator(currenciesDatabase, itemsDatabase, shopsDatabase, accountsDatabase)

export { HYDRATOR }



async function checkDbVersion() {
    const dbVersion = await getDbVersion()
    if (dbVersion !== REQUIRED_DB_VERSION) {
        PrettyLog.error(`Outdated database (required: ${REQUIRED_DB_VERSION}, current: ${dbVersion}); please update with 'npm run update-db'`)
        PrettyLog.info("Exiting...")
        
        process.exit(1)
    }
}