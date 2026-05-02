import { NanoId } from "@/database/database.types.js"
import { accountRawSchema } from "@/features/accounts/schemas/accounts.schemas.js"
import { currencyRawSchema } from "@/features/currencies/schemas/currencies.schemas.js"
import { itemRawSchema } from "@/features/items/schemas/items.schemas.js"
import { productActionSchema, productRawSchema } from "@/features/shops/schemas/products.schemas.js"
import { shopRawSchema } from "@/features/shops/schemas/shop.schemas.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { validate } from "@/lib/validation/validation.js"
import { nanoIdSchema } from "@/schemas/utils.js"
import fs from "fs/promises"
import { nanoid } from "nanoid"
import { fileURLToPath } from "url"
import z from "zod"
import { migrateDBtoNanoid } from "./migrate-db-to-nanoid.js"

// Legacy types
export interface OldProduct {
    id: string
    shopId: string
    name: string
    emoji: string
    description: string
    amount?: number
    price: number
    action?: {
        type: "give-role" | "give-currency"
        options: {
            roleId?: string
            currencyId?: string
            amount?: number
        }
    }
}

type OldCurrency = {
    id: string
    name: string
    emoji: string
}

type OldShop = {
    id: string
    name: string
    emoji: string
    description: string
    currencyId: string
    discountCodes: {[code: string]: number}
    reservedTo?: string
    products: Record<string, OldProduct>
}

type OldAccount =  {
    currencies: {[currencyId: string]: {
        item: string
        amount: number
    }},
    inventory: {[productId: string]: {
        item: {
            id: string
            shopId: string
        }
        amount: number
    }}
}

// ---

const isRanAsScript = process.argv[1] === fileURLToPath(import.meta.url)

function log(fn: () => unknown) {
    if (isRanAsScript) {
        fn()
    }
}


const save = async (path: string, content: object) => {
    try {
        await fs.writeFile(path, JSON.stringify(content, null, 4))
        return true
    } catch {
        return false
    }
}

const accountsPath = "data/accounts.json"
const currenciesPath = "data/currencies.json"
const shopsPath = "data/shops.json"
const itemsPath = "data/items.json"

const accounts = JSON.parse(await fs.readFile(accountsPath, "utf-8")) as Record<string, OldAccount>
const currencies = JSON.parse(await fs.readFile(currenciesPath, "utf-8")) as Record<string, OldCurrency>
const shops = JSON.parse(await fs.readFile(shopsPath, "utf-8")) as Record<string, OldShop>


async function migrateShops() {
    let errorCount = 0

    const items: Record<string, z.infer<typeof itemRawSchema>> = {}
    const newShops: Record<string, z.infer<typeof shopRawSchema>> = {}

    for (const [shopId, shop] of Object.entries(shops)) {
        const { products, currencyId, id:_ , ...newShop } = shop
        
        const newProducts: Record<NanoId, z.infer<typeof productRawSchema>> = {}

        for (const [productId, product] of Object.entries(products)) {
            const { id, shopId: _, price: priceNum, ...newProductWithoutPriceWithoutId } = product
            let item = newProductWithoutPriceWithoutId

            let stock: number | null | undefined 
            if ("stock" in newProductWithoutPriceWithoutId && (typeof newProductWithoutPriceWithoutId.stock === "number" || newProductWithoutPriceWithoutId.stock === null)) {
                const { stock: productStock, ...newProductWithoutPriceWithoutIdWithoutStock } = newProductWithoutPriceWithoutId
                stock = productStock
                item = newProductWithoutPriceWithoutIdWithoutStock
            }

            let action: z.infer<typeof productActionSchema> | undefined | null = undefined
            if ("action" in newProductWithoutPriceWithoutId) {
                const { action: productAction, ...newProductWithoutPriceWithoutIdWithoutAction } = newProductWithoutPriceWithoutId
                const { type, options } = productAction
                const [error, actionParsed] = validate(productActionSchema, { kind: type, options })
                if (error) {
                    log(() => PrettyLog.warn(`Error parsing action of product ${productId} in shop ${shopId}\n${z.prettifyError(error)}`))
                } else {
                    action = actionParsed
                }
                item = newProductWithoutPriceWithoutIdWithoutAction
            }

            const newPrice = Object.fromEntries([[currencyId, priceNum]])

            let newProduct: z.infer<typeof productRawSchema> = { price: newPrice, itemId: nanoIdSchema.parse(id) }

            if (stock != undefined) {
                newProduct = { ...newProduct, stock }
            }
            if (action != undefined) {
                newProduct = { ...newProduct, action }
            }

            const [error1, newProductValidated] = validate(productRawSchema, newProduct)

            if (error1) {
                log(() => PrettyLog.error(`Invalid Product: ${productId}\n${z.prettifyError(error1)}`))
                errorCount++
                continue
            }

            const [error2, itemValidated] = validate(itemRawSchema, { ...item, refCount: 1 })
            if (error2) {
                log(() => PrettyLog.error(`Invalid Item for product ${productId} in shop ${shopId}\n${z.prettifyError(error2)}`))
                errorCount++
                continue
            }

            items[productId] = itemValidated
            
            const newProductId = nanoid<NanoId>()
            newProducts[newProductId] = newProductValidated
        }

        const [error3, newShopValidated] = validate(shopRawSchema, { ...newShop, products: newProducts })
        if (error3) {
            log(() => PrettyLog.error(`Invalid Shop: ${shopId}\n${error3.message}`))
            errorCount++
            continue
        }

        newShops[shopId] = newShopValidated
    }

    if (errorCount > 0) {
        log(() => PrettyLog.error(`Migration failed with ${errorCount} errors, not saving changes.`))
        return { items: undefined, shops: undefined }
    }

    return {
        items,
        shops: newShops
    }
}


async function migrateAccounts() {
    const newAccounts: Record<string, z.infer<typeof accountRawSchema>> = {}

    for (const [accountId, account] of Object.entries(accounts)) {
        const currencies = Object.fromEntries(Array.from(Object.entries(account.currencies)).map(([id, balance]) => [id, balance.amount]))
        const inventory = Object.fromEntries(Array.from(Object.entries(account.inventory)).map(([id, balance]) => [id, balance.amount]))
        const newAccount = { currencies, inventory }
        newAccounts[accountId] = newAccount
    }

    return await save(accountsPath, newAccounts)
}

async function migrateCurrencies() {
    const newCurrencies: Record<string, z.infer<typeof currencyRawSchema>> = {}

    try {
        for (const [currencyId, currency] of Object.entries(currencies)) {
            const { id: _, ...newCurrency } = currency
            newCurrencies[currencyId] = currencyRawSchema.parse({ newCurrency, refCount: 0 })
        }
    } catch (error) {
        log(() => {
            PrettyLog.error(`Migration of currencies failed, not saving changes.\n`)
            PrettyLog.error(`${error}`)
        })
        return false
    }
    
    return await save(currenciesPath, newCurrencies)
}


const dbInfoPath = "data/_database.json"

const toBackup = [accountsPath, currenciesPath, shopsPath]

async function migrateAll() {
    for (const path of toBackup) {
        const data = await fs.readFile(path, "utf-8")
        await fs.writeFile(path.replace(".json", ".backup.json"), data)
    }
    if(!(await migrateDBtoNanoid())) return false


    const { items, shops } = await migrateShops()

    if (items === undefined || shops === undefined) {
        return false
    }

    if (!(await save(itemsPath, items))) return false
    if (!(await save(shopsPath, shops))) return false
    

    if (!(await migrateAccounts())) return false
    if (!(await migrateCurrencies())) return false

    if(!(await save(dbInfoPath, { version: "3" }))) return false

    log(() => PrettyLog.success("Migration completed"))

    return true
}

export async function restoreDBfromBackup() {
    for (const path of toBackup) {
        const data = await fs.readFile(path.replace(".json", ".backup.json"), "utf-8")
        await fs.writeFile(path, data)
    }
}

export async function getDbVersion() {
    const dbInfo: any = JSON.parse(await fs.readFile(dbInfoPath, "utf-8"))

    if (typeof dbInfo === "object" && 
        dbInfo !== null && 
        "version" in dbInfo && 
        typeof dbInfo.version === "number"
    ) {
        return dbInfo.version
    }

    return undefined
}
export async function migrateDBtoV3() {
    const version = await getDbVersion()
    if (version == 3) {
        log(() => PrettyLog.success("Database is already at version 3"))
        return "alreadyDone" as const
    }

    return await migrateAll() ? "success" as const : "failure" as const
    
}

async function main() {
    if (process.argv[2] === "--restore") {
        await restoreDBfromBackup()
        PrettyLog.success("Database restored from backup")
        await save(dbInfoPath, { version: "2" })
        return
    } 

    const result = await migrateDBtoV3()
    if (result == "failure") {
        PrettyLog.info("Migration failed, you can restore your data by executing this function again with the --restore flag")
    }
}


if (isRanAsScript) {
    await main()
}
