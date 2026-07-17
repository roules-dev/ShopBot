import { itemsDatabase } from "@/core/database/init-databases.js";
import { NanoId } from "@/database/database.types.js";
import { dbCreateItem, dbDeleteItem, dbUpdateItem } from "@/features/items/database/items.database.js";
import { Item } from "@/features/items/database/items.types.js";
import { Exact } from "@/lib/types/constraints.js";

export function getItems() {
    return itemsDatabase.list()
}

export function createItem<T extends Item>(options: Exact<T, Item>) {
    return dbCreateItem(itemsDatabase, options)
}

export function deleteItem(itemId: NanoId) {
    return dbDeleteItem(itemsDatabase, itemId)
}

export function updateItem(itemId: NanoId, options: Partial<Item>) {
    return dbUpdateItem(itemsDatabase, itemId, options)
}
