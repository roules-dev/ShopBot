import { JsonDatabase } from "@/database/json-database.js"
import { REQUIRED_DB_VERSION } from "@/global-settings.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { getDbVersion } from "@/tools/migrate-db-to-v3.js"
import fs from "fs/promises"
import { Hydrator } from "./hydrator.js"
import { accountRawSchema } from "@/features/accounts/schemas/accounts.schemas.js"
import { currencyRawSchema } from "@/features/currencies/schemas/currencies.schemas.js"
import { itemRawSchema } from "@/features/items/schemas/items.schemas.js"
import { shopRawSchema } from "@/features/shops/schemas/shop.schemas.js"
import { nanoIdSchema, snowflakeSchema } from "@/schemas/utils.js"

checkDbVersion()

const accountsDatabasePath = "./data/accounts.json"
const currenciesDatabasePath = "./data/currencies.json"
const shopsDatabasePath = "./data/shops.json"
const itemsDatabasePath = "./data/items.json"

const accountsDatabaseRaw = JSON.parse(await fs.readFile(accountsDatabasePath, "utf-8"))
const currenciesDatabaseRaw = JSON.parse(await fs.readFile(currenciesDatabasePath, "utf-8"))
const shopsDatabaseRaw = JSON.parse(await fs.readFile(shopsDatabasePath, "utf-8"))
const itemsDatabaseRaw = JSON.parse(await fs.readFile(itemsDatabasePath, "utf-8"))

const accountsDatabase = new JsonDatabase(accountsDatabaseRaw, accountsDatabasePath, accountRawSchema, snowflakeSchema)
const currenciesDatabase = new JsonDatabase(currenciesDatabaseRaw, currenciesDatabasePath, currencyRawSchema, nanoIdSchema)
const shopsDatabase = new JsonDatabase(shopsDatabaseRaw, shopsDatabasePath, shopRawSchema, nanoIdSchema)
const itemsDatabase = new JsonDatabase(itemsDatabaseRaw, itemsDatabasePath, itemRawSchema, nanoIdSchema)

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