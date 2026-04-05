import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { getProducts } from "@/core/services/shops/products.services.js"
import { getShops } from "@/core/services/shops/shops.services.js"
import { NanoId, DatabaseJsonBody, DatabaseLegacy } from "@/database/database-types.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { Product } from "@/features/shops/database/products-types.js"
import { Snowflake } from "discord.js"
import { ok } from "@/lib/error-handling.js"


export interface Balance<T> {
    item: T 
    amount: number
}

export type AccountBalanceTypes = {
    currencies: Balance<Currency>
    inventory: Balance<Product>
}

export type Account = {
    [K in keyof AccountBalanceTypes]: Map<NanoId, AccountBalanceTypes[K]>
}

export interface ProductId {
    id: NanoId
    shopId: NanoId
}

export interface AccountsDatabaseJsonBody extends DatabaseJsonBody {
    [userId: Snowflake]: {
        currencies: {[currencyId: NanoId]: Balance<NanoId>},
        inventory: {[productId: NanoId]: Balance<ProductId>}
    }
}

export class AccountsDatabase extends DatabaseLegacy<Snowflake, Account> {
    public toJSON(): AccountsDatabaseJsonBody {
        const accountsJson: AccountsDatabaseJsonBody = {}

        this.data.forEach((account, userId) => {
            const currencies = Object.fromEntries(Array.from(account.currencies.entries())
                .map(([id, balance]) => [id, { item: balance.item.id, amount: balance.amount } as Balance<NanoId>]))

            const inventory = Object.fromEntries(Array.from(account.inventory.entries())
                .map(([id, balance]) => [id, { item: { id: balance.item.id, shopId: balance.item.shopId }, amount: balance.amount } as Balance<ProductId>]))

            accountsJson[userId] = { currencies, inventory }
        })

        return accountsJson
    }

    protected parseRaw(databaseRaw: AccountsDatabaseJsonBody) {
        const accounts: Map<Snowflake, Account> = new Map()

        for (const [userId, { currencies: currenciesJson, inventory: inventoryJson }] of Object.entries(databaseRaw)) {
            const currenciesArray = Array.from(Object.entries(currenciesJson))
                .filter(([id, _]) => getCurrencies().has(id))
                .map(([id, balance]) => [id, { item: getCurrencies().get(id), amount: balance.amount }] as [NanoId, Balance<Currency>])

            const inventoryArray = Array.from(Object.entries(inventoryJson))
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

