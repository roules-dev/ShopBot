import shops from "@/../data/shops.json" with { type: "json" }
import { Item, ItemJSON } from "@/features/items/database/items-types.js"
import { ShopsDatabaseJSONBody } from "@/features/shops/database/shops-types.js"
import fs from "fs/promises"
import { migrateDBtoNanoid } from "./migrate-db-to-nanoid.js"
import { NanoId } from "@/database/database-types.js"
import { validate } from "@/lib/validation.js"
import { ItemJSONSchema, ItemSchema } from "@/features/items/schemas/items-schemas.js"
import { PrettyLog } from "@/lib/pretty-log.js"

const save = async (path: string, content: object): Promise<boolean> => {
    try {
        await fs.writeFile(path, JSON.stringify(content, null, 4))
        return true
    } catch {
        return false
    }
}

const shopsPath = "data/shops2.json"
const itemsPath = "data/items.json"

type Items = Record<string, ItemJSON>

type NewShopsJSONBody = ShopsDatabaseJSONBody extends {
    [id: string]: infer ShopJSONBody
} ? {
    [id: string]: Omit<ShopJSONBody, "products" | "currencyId" | "id"> & {
        productIds: Array<NanoId>
    }
} : never

export async function migrateDBtoV3() {
    await migrateDBtoNanoid()

    const items: Items = {}

    const newShops: NewShopsJSONBody = {}

    for (const [shopId, shop] of Object.entries(shops)) {
        const { products, currencyId, id:_ , ...newShop } = shop
        
        const productIds = []

        for (const [productId, product] of Object.entries(products)) {
            const { shopId: _, id: __, price: priceNum, ...newProductWithoutPriceWithoutId } = product

            const newPrice = Object.fromEntries([[currencyId, priceNum]])

            const newProduct = { price: newPrice , ...newProductWithoutPriceWithoutId}

            const [error, newProductValidated] = validate(ItemJSONSchema, newProduct)

            if (error) {
                PrettyLog.error(`Invalid Item: ${productId}\n${error.message}`)
                continue
            }

            items[productId] = newProductValidated
            
            productIds.push(productId)
        }

        newShops[shopId] = { ...newShop, productIds }
    }

    await save(itemsPath, items)
    await save(shopsPath, newShops)


    // also update currencies and accounts
}