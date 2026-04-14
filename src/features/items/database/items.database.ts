import { ItemsDatabase } from "@/core/database/database.types.js"
import { ApiError, NanoId } from "@/database/database.types.js"
import { err } from "@/lib/error-handling.js"
import { Exact } from "@/lib/types/constraints.js"
import { ok } from "assert"
import { nanoid } from "nanoid"
import { Item } from "./items.types.js"

export function dbHasItemWithName(db: ItemsDatabase, itemName: string) {
    for (const [_id, item] of db.list()) {
        if (item.name === itemName) {
            return true
        }
    }
    return false
}

export async function dbCreateItem<T extends Item>(db: ItemsDatabase, options: Exact<T, Item>) {
    if (dbHasItemWithName(db, options.name)) return err(new ApiError("ItemAlreadyExists"))
    
    const newItemId = nanoid<NanoId>()
    const newItem = { id: newItemId, ...options }

    const [error] = await db.set(newItemId, newItem)
    if (error) return err(error)

    return ok(newItem)
}

export async function dbDeleteItem(db: ItemsDatabase, itemId: NanoId) {
    if (!db.get(itemId)) return err(new ApiError("ItemDoesNotExist"))

    const [error] = await db.delete(itemId)
    if (error) return err(error)

    return ok(true)
}

export async function dbUpdateItem(db: ItemsDatabase, itemId: NanoId, options: Partial<Item>) {  
    const item = db.get(itemId)
    if (!item) return err(new ApiError("ItemDoesNotExist"))
    
    const [error, updated] = await db.patch(itemId, options)
    if (error) return err(error)

    return ok(updated)
}
