import { NanoId } from "@/database/database-types.js"
import { AccountRawSchema } from "@/features/accounts/schemas/accounts-schemas.js"
import { CurrencyRawSchema } from "@/features/currencies/schemas/currencies-schemas.js"
import { ItemRawSchema } from "@/features/items/schemas/items-schemas.js"
import { ProductActionSchema, ProductRawSchema, ShopRawSchema } from "@/features/shops/schemas/shop-schemas.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { validate } from "@/lib/validation.js"
import fs from "fs/promises"
import { nanoid } from "nanoid"
import z from "zod"
import { migrateDBtoNanoid } from "./migrate-db-to-nanoid.js"
import { fileURLToPath } from "url"
import { NanoIdSchema } from "@/schemas/utils.js"

// Legacy types
export interface Product {
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
    products: Map<string, Product>
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





const save = async (path: string, content: object): Promise<boolean> => {
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

    const items: Record<string, z.infer<typeof ItemRawSchema>> = {}
    const newShops: Record<string, z.infer<typeof ShopRawSchema>> = {}

    for (const [shopId, shop] of Object.entries(shops)) {
        const { products, currencyId, id:_ , ...newShop } = shop
        
        const newProducts: Record<NanoId, z.infer<typeof ProductRawSchema>> = {}

        for (const [productId, product] of Object.entries(products)) {
            const { id, shopId: _, price: priceNum, ...newProductWithoutPriceWithoutId } = product
            let item = newProductWithoutPriceWithoutId

            let stock: number | null | undefined 
            if ("stock" in newProductWithoutPriceWithoutId) {
                const { stock: productStock, ...newProductWithoutPriceWithoutIdWithoutStock } = newProductWithoutPriceWithoutId
                stock = productStock
                item = newProductWithoutPriceWithoutIdWithoutStock
            }

            let action: z.infer<typeof ProductActionSchema> | undefined | null = undefined
            if ("action" in newProductWithoutPriceWithoutId) {
                const { action: productAction, ...newProductWithoutPriceWithoutIdWithoutAction } = newProductWithoutPriceWithoutId
                const [error, actionParsed] = validate(ProductActionSchema, productAction)
                if (error) {
                    PrettyLog.warn(`Error parsing action of product ${productId} in shop ${shopId}\n${z.prettifyError(error)}`)
                } else {
                    action = actionParsed
                }
                item = newProductWithoutPriceWithoutIdWithoutAction
            }

            const newPrice = Object.fromEntries([[currencyId, priceNum]])

            let newProduct: z.infer<typeof ProductRawSchema> = { price: newPrice, itemId: NanoIdSchema.parse(id) }

            if (stock != undefined) {
                newProduct = { ...newProduct, stock }
            }
            if (action != undefined) {
                newProduct = { ...newProduct, action }
            }

            const [error1, newProductValidated] = validate(ProductRawSchema, newProduct)

            if (error1) {
                PrettyLog.error(`Invalid Product: ${productId}\n${z.prettifyError(error1)}`)
                errorCount++
                continue
            }

            const [error2, itemValidated] = validate(ItemRawSchema, item)
            if (error2) {
                PrettyLog.error(`Invalid Item for product ${productId} in shop ${shopId}\n${z.prettifyError(error2)}`)
                errorCount++
                continue
            }

            items[productId] = itemValidated
            
            const newProductId = nanoid<NanoId>()
            newProducts[newProductId] = newProductValidated
        }

        const [error3, newShopValidated] = validate(ShopRawSchema, { ...newShop, products: newProducts })
        if (error3) {
            PrettyLog.error(`Invalid Shop: ${shopId}\n${error3.message}`)
            continue
        }

        newShops[shopId] = newShopValidated
    }

    if (errorCount > 0) {
        PrettyLog.error(`Migration failed with ${errorCount} errors, not saving changes.`)
        return { items: undefined, shops: undefined }
    }

    return {
        items,
        shops: newShops
    }
}


async function migrateAccounts() {
    const newAccounts: Record<string, z.infer<typeof AccountRawSchema>> = {}

    for (const [accountId, account] of Object.entries(accounts)) {
        const currencies = Object.fromEntries(Array.from(Object.entries(account.currencies)).map(([id, balance]) => [id, balance.amount]))
        const inventory = Object.fromEntries(Array.from(Object.entries(account.inventory)).map(([id, balance]) => [id, balance.amount]))
        const newAccount = { currencies, inventory }
        newAccounts[accountId] = newAccount
    }

    await save(accountsPath, newAccounts)
}

async function migrateCurrencies() {
    const newCurrencies: Record<string, z.infer<typeof CurrencyRawSchema>> = {}

    for (const [currencyId, currency] of Object.entries(currencies)) {
        const { id: _, ...newCurrency } = currency
        newCurrencies[currencyId] = newCurrency
    }

    await save(currenciesPath, newCurrencies)
}


const dbInfoPath = "data/_database.json"

const toBackup = [accountsPath, currenciesPath, shopsPath]

export async function migrateDBtoV3() {
    for (const path of toBackup) {
        const data = await fs.readFile(path, "utf-8")
        await fs.writeFile(path.replace(".json", ".backup.json"), data)
    }
    await migrateDBtoNanoid()


    const { items, shops } = await migrateShops()

    if (items) {
        await save(itemsPath, items)
    }
    if (shops) {
        await save(shopsPath, shops)
    }

    await migrateAccounts()
    await migrateCurrencies()

    await save(dbInfoPath, { version: "3" })

    PrettyLog.success("Migration completed")
}

export async function restoreDBfromBackup() {
    for (const path of toBackup) {
        const data = await fs.readFile(path.replace(".json", ".backup.json"), "utf-8")
        await fs.writeFile(path, data)
    }

}

async function main() {
    if (process.argv[2] === "restore") {
        await restoreDBfromBackup()
        PrettyLog.success("Database restored from backup")
        await save(dbInfoPath, { version: "2" })
        return
    } 

    const dbInfo: unknown = JSON.parse(await fs.readFile(dbInfoPath, "utf-8"))

    if (typeof dbInfo === "object" && dbInfo !== null && "version" in dbInfo && dbInfo.version === "3") {
        PrettyLog.success("Database is already at version 3")
        return
    }

    await migrateDBtoV3()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await main()
}
