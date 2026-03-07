import shops from "@/../data/shops.json" with { type: "json" }
import { NanoId } from "@/database/database-types.js"
import { ShopsDatabaseJsonBody } from "@/features/shops/database/shops-types.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { validate } from "@/lib/validation.js"
import fs from "fs/promises"
import z from "zod"
import { migrateDBtoNanoid } from "./migrate-db-to-nanoid.js"
import { ItemRawSchema } from "@/features/items/schemas/items-schemas.js"
import { Product } from "@/features/shops/database/products-types.js"
import { ProductRawSchema } from "@/features/shops/schemas/shop-schemas.js"

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

type Items = Record<string, z.infer<typeof ItemRawSchema>>

type NewShopsJsonBody = ShopsDatabaseJsonBody extends {
    [id: string]: infer ShopJsonBody
} ? {
    [id: string]: Omit<ShopJsonBody, "products" | "currencyId" | "id" | "stock"> & {
        products: Record<NanoId, z.infer<typeof ProductRawSchema>>
    }
} : never

export async function migrateDBtoV3() {
    await migrateDBtoNanoid()

    const items: Items = {}

    const newShops: NewShopsJsonBody = {}

    for (const [shopId, shop] of Object.entries(shops)) {
        const { products, currencyId, id:_ , ...newShop } = shop
        
        const newProducts: Record<NanoId, z.infer<typeof ProductRawSchema>> = {}

        for (const [productId, product] of Object.entries(products)) {
            const { shopId: _, id: __, price: priceNum, stock ,...newProductWithoutPriceWithoutIdWithoutStock } = product as Product

            const newPrice = Object.fromEntries([[currencyId, priceNum]])

            const newProduct = { price: newPrice , ...newProductWithoutPriceWithoutIdWithoutStock}

            const [error, newProductValidated] = validate(ItemRawSchema, newProduct)

            if (error) {
                PrettyLog.error(`Invalid Item: ${productId}\n${error.message}`)
                continue
            }

            items[productId] = newProductValidated
            
            newProducts[productId] = { price: newPrice, stock }
        }

        newShops[shopId] = { ...newShop, products: newProducts }
    }

    await save(itemsPath, items)
    await save(shopsPath, newShops)


    // also update currencies and accounts
}