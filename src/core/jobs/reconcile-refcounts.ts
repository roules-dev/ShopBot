import { NanoId } from "@/database/database.types.js";
import { currenciesDatabase, itemsDatabase, shopsDatabase } from "../database/init-databases.js";
import { objectEntries } from "@/utils/objects.js";

type RefCounts = {
    currencies: Record<NanoId, number>
    items: Record<NanoId, number>
}

export async function reconcileRefCounts() {
    const refCounts: RefCounts = {
        currencies: {},
        items: {},
    }

    for (const [_, shop] of shopsDatabase.list()) {
        for (const [_, product] of objectEntries(shop.products)) {
            if (refCounts.items[product.itemId] === undefined) {
                refCounts.items[product.itemId] = 0
            }

            refCounts.items[product.itemId]! += 1

            for (const [currencyId, _] of objectEntries(product.price)) {
                if (refCounts.currencies[currencyId] === undefined) {
                    refCounts.currencies[currencyId] = 0
                }

                refCounts.currencies[currencyId]! += 1
            }

            if (product.action && product.action.kind === "give-currency") {
                const { currencyId } = product.action.options

                if (refCounts.currencies[currencyId] === undefined) {
                    refCounts.currencies[currencyId] = 0
                }
                
                refCounts.currencies[currencyId]! += 1
            }
        }
    }

    for (const [currencyId, _] of currenciesDatabase.list()) {
        await currenciesDatabase.patch(currencyId, { 
            refCount: refCounts.currencies[currencyId] || 0
        })
    }

    for (const [itemId, _] of itemsDatabase.list()) {
        await itemsDatabase.patch(itemId, { 
            refCount: refCounts.items[itemId] || 0
        })
    }
}
