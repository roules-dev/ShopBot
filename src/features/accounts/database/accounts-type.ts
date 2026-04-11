import z from "zod"
import { AccountRawSchema } from "../schemas/accounts-schemas.js"




export type Account = z.infer<typeof AccountRawSchema>

// export interface ProductId {
//     id: NanoId
//     shopId: NanoId
// }

// export interface AccountsDatabaseJsonBody extends DatabaseJsonBody {
//     [userId: Snowflake]: {
//         currencies: {[currencyId: NanoId]: Balance<NanoId>},
//         inventory: {[productId: NanoId]: Balance<ProductId>}
//     }
// }

// export class AccountsDatabase extends DatabaseLegacy<Snowflake, Account> {
//     public toJSON(): AccountsDatabaseJsonBody {
//         const accountsJson: AccountsDatabaseJsonBody = {}

//         this.data.forEach((account, userId) => {
//             const currencies = Object.fromEntries(Array.from(account.currencies.entries())
//                 .map(([id, balance]) => [id, { item: balance.resource.id, amount: balance.amount } as Balance<NanoId>]))

//             const inventory = Object.fromEntries(Array.from(account.inventory.entries())
//                 .map(([id, balance]) => [id, { item: { id: balance.resource.id, shopId: balance.resource.shopId }, amount: balance.amount } as Balance<ProductId>]))

//             accountsJson[userId] = { currencies, inventory }
//         })

//         return accountsJson
//     }

//     protected parseRaw(databaseRaw: AccountsDatabaseJsonBody) {
//         const accounts: Map<Snowflake, Account> = new Map()

//         for (const [userId, { currencies: currenciesJson, inventory: inventoryJson }] of Object.entries(databaseRaw)) {
//             const currenciesArray = Array.from(Object.entries(currenciesJson))
//                 .filter(([id, _]) => getCurrencies().has(id as BrandedNanoId))
//                 .map(([id, balance]) => [id, { item: getCurrencies().get(id as BrandedNanoId), amount: balance.amount }] as [NanoId, Balance<Currency>])

//             const inventoryArray = Array.from(Object.entries(inventoryJson))
//                 .filter(this.inventoryItemFilter)
//                 .map(this.inventoryItemMapper)

//             accounts.set(userId, { currencies: new Map(currenciesArray), inventory: new Map(inventoryArray) })
//         }

//         return ok(accounts)
//     }


//     private inventoryItemFilter([id, balance]: [NanoId, Balance<ProductId>]) {
//         const [error, products] = getProducts(balance.resource.shopId)
//         if (error) return false

//         return getShops().has(balance.resource.shopId) && products.has(id)
//     }

//     private inventoryItemMapper([id, balance]: [NanoId, Balance<ProductId>]): [NanoId, Balance<Product>] {
//         const [error, products] = getProducts(balance.resource.shopId)
//         if (error) throw new Error("This should never happen since the filter should have filtered it out")

//         const product = products.get(id)!
//         return [id, { item: product, amount: balance.amount }]
//     }
// }

