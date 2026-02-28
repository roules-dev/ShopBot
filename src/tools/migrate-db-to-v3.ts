import { migrateDBtoNanoid } from "./migrate-db-to-nanoid.js"
import fs from "fs/promises"
import shops from "@/../data/shops.json" with { type: "json" }
import { Product } from "@/features/shops/database/products-types.js"

const save = async (path: string, content: object): Promise<boolean> => {
    try {
        await fs.writeFile(path, JSON.stringify(content, null, 4))
        return true
    } catch {
        return false
    }
}

const shopsPath = "data/shops.json"
const itemsPath = "data/items.json"

async function migrateDBtoV3() {
    await migrateDBtoNanoid()

    const items: Record<string, Product> = {}

    for (const [_, shop] of Object.entries(shops)) {
        const { products } = shop

        for (const [productId, product] of Object.entries(products)) {
            items[productId] = product
        }
    }

    await save(itemsPath, items)
}