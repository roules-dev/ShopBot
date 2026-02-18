import { Database, DatabaseJSONBody, NanoId } from "@/database/database-types.js"
import { getCurrencies } from "@/features/currencies/database/currencies-database.js"; // external dependency, should be refactored
import { Currency } from "@/features/currencies/database/currencies-types.js"; // external dependency, should be refactored
import { getProducts } from "@/features/shops/database/products-database.js"; // external dependency, should be refactored
import { Product } from "@/features/shops/database/products-types.js"; // external dependency, should be refactored
import { getShops } from "@/features/shops/database/shops-database.js"; // external dependency, should be refactored
import { ok } from "@/lib/error-handling.js"
import { Snowflake } from "discord.js"


export interface Balance<Item> {
    item: Item
    amount: number
}

export interface Account {
    currencies: Map<NanoId, Balance<Currency>>
    inventory: Map<NanoId, Balance<Product>>
}

export interface ProductId {
    id: NanoId
    shopId: NanoId
}

export interface AccountsDatabaseJSONBody extends DatabaseJSONBody {
    [userId: Snowflake]: {
        currencies: {[currencyId: NanoId]: Balance<NanoId>},
        inventory: {[productId: NanoId]: Balance<ProductId>}
    }
}

export class AccountsDatabase extends Database<Snowflake, Account> {
    public toJSON(): AccountsDatabaseJSONBody {
        const accountsJSON: AccountsDatabaseJSONBody = {}

        this.data.forEach((account, userId) => {
            const currencies = Object.fromEntries(Array.from(account.currencies.entries())
                .map(([id, balance]) => [id, { item: balance.item.id, amount: balance.amount } as Balance<NanoId>]))

            const inventory = Object.fromEntries(Array.from(account.inventory.entries())
                .map(([id, balance]) => [id, { item: { id: balance.item.id, shopId: balance.item.shopId }, amount: balance.amount } as Balance<ProductId>]))

            accountsJSON[userId] = { currencies, inventory }
        })

        return accountsJSON
    }

    protected parseRaw(databaseRaw: AccountsDatabaseJSONBody) {
        const accounts: Map<Snowflake, Account> = new Map()

        for (const [userId, { currencies: currenciesJSON, inventory: inventoryJSON }] of Object.entries(databaseRaw)) {
            const currenciesArray = Array.from(Object.entries(currenciesJSON))
                .filter(([id, _]) => getCurrencies().has(id))
                .map(([id, balance]) => [id, { item: getCurrencies().get(id), amount: balance.amount }] as [NanoId, Balance<Currency>])

            const inventoryArray = Array.from(Object.entries(inventoryJSON))
                .filter(this.inventoryItemFilter)
                .map(this.inventoryItemMapper)

            accounts.set(userId, { currencies: new Map(currenciesArray), inventory: new Map(inventoryArray) })
        }

        return ok(accounts)
    }


    private inventoryItemFilter([id, balance]: [NanoId, Balance<ProductId>]) {
        const [error, products] = getProducts(balance.item.shopId)
        if (error) return false

        return getShops().has(balance.item.shopId) && products.has(id)
    }

    private inventoryItemMapper([id, balance]: [NanoId, Balance<ProductId>]): [NanoId, Balance<Product>] {
        const [error, products] = getProducts(balance.item.shopId)
        if (error) throw new Error("This should never happen since the filter should have filtered it out")

        const product = products.get(id)!
        return [id, { item: product, amount: balance.amount }]
    }
}

