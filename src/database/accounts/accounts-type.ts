import { Snowflake } from "discord.js"
import { getCurrencies } from "../currencies/currencies-database"
import { Currency } from "../currencies/currencies-types"
import { Database, DatabaseJSONBody, Id } from "../database-types"
import { getProducts, getShops } from "../shops/shops-database"
import { Product } from "../shops/shops-types"

export interface Balance<Item> {
    item: Item
    amount: number
}

export interface Account {
    currencies: Map<Id, Balance<Currency>>
    inventory: Map<Id, Balance<Product>>
}

export interface ProductId {
    id: Id
    shopId: Id
}

export interface AccountsDatabaseJSONBody extends DatabaseJSONBody {
    [userId: Snowflake]: {
        currencies: {[currencyId: Id]: Balance<Id>},
        inventory: {[productId: Id]: Balance<ProductId>}
    }
}

export class AccountsDatabase extends Database {
    public accounts: Map<Snowflake, Account>

    public constructor (databaseRaw: AccountsDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.accounts = this.parseRaw(databaseRaw)
    }

    public toJSON(): AccountsDatabaseJSONBody {
        const accountsJSON: AccountsDatabaseJSONBody = {}

        this.accounts.forEach((account, userId) => {
            const currencies = Object.fromEntries(Array.from(account.currencies.entries()).map(([id, balance]) => [id, { item: balance.item.id, amount: balance.amount } as Balance<Id>]))
            const inventory = Object.fromEntries(Array.from(account.inventory.entries()).map(([id, balance]) => [id, { item: { id: balance.item.id, shopId: balance.item.shopId }, amount: balance.amount } as Balance<ProductId>]))

            accountsJSON[userId] = { currencies, inventory }
        })

        return accountsJSON
    }

    protected parseRaw(databaseRaw: AccountsDatabaseJSONBody): Map<Snowflake, Account> {
        const accounts: Map<Snowflake, Account> = new Map()

        for (const [userId, { currencies: currenciesJSON, inventory: inventoryJSON }] of Object.entries(databaseRaw)) {
            const currenciesArray = Array.from(Object.entries(currenciesJSON)).filter(([id, _]) => getCurrencies().has(id)).map(([id, balance]) => [id, { item: getCurrencies().get(id), amount: balance.amount }] as [Id, Balance<Currency>])
            const inventoryArray = Array.from(Object.entries(inventoryJSON)).filter(([id, balance]) => getShops().has(balance.item.shopId) && getProducts(balance.item.shopId).has(id)).map(([id, balance]) => [id, { item: getProducts(balance.item.shopId)!.get(id)!, amount: balance.amount }] as [Id, Balance<Product>])

            accounts.set(userId, { currencies: new Map(currenciesArray), inventory: new Map(inventoryArray) })
        }

        return accounts
    }
}