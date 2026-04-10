import { itemsDatabase } from "@/core/database/init-databases.js";

export function getItems() {
    return itemsDatabase.list()
}