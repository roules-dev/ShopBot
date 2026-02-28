import accounts from "@/../data/accounts.json" with { type: "json" }
import { DatabaseError } from "@/database/database-types.js"
import { Account, AccountsDatabase } from "@/features/accounts/database/accounts-type.js"
import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Product } from "@/features/shops/database/products-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { Snowflake } from "discord.js"

const accountsDatabase = new AccountsDatabase(accounts, "data/accounts.json")

export async function getOrCreateAccount(id: Snowflake) {
    let account = accountsDatabase.data.get(id)

    if (!account) {
        accountsDatabase.data.set(id, { currencies: new Map(), inventory: new Map() })

        const [error] = await accountsDatabase.save()
        if (error) return err(error)

        account = accountsDatabase.data.get(id)!
    }

    return ok(Object.freeze(account))
}

export async function setAccountCurrencyAmount(id: Snowflake, currencyId: string, amount: number) {
    const [error, account] = await getOrCreateAccount(id)
    if (error) return err(error)

    const currency = getCurrencies().get(currencyId)
    if (!currency) return err(new DatabaseError("CurrencyDoesNotExist"))

    const currencyBalance = account.currencies.get(currencyId)

    if (!currencyBalance) {
        account.currencies.set(currencyId, 
            { 
                item: currency, 
                amount: +amount.toFixed(2)
            }
        )
    } else {
        currencyBalance.amount = +amount.toFixed(2)
    }

    const [error2] = await accountsDatabase.save()
    if (error2) return err(error2)

    return ok(Object.freeze(currency))
}

export async function setAccountItemAmount(id: Snowflake, product: Product, amount: number) {
    const [error, account] = await getOrCreateAccount(id)
    if (error) return err(error)
        
    const productBalance = account.inventory.get(product.id)

    if (!productBalance) {
        account.inventory.set(product.id, 
            { 
                item: product, 
                amount 
            }
        )
    }
    else {
        productBalance.amount = amount
    }

    const [error2] = await accountsDatabase.save()
    if (error2) return err(error2)

    return ok(Object.freeze(product))
}

export async function emptyAccount(id: Snowflake, empty: "currencies" | "inventory" | "all") {
    const account = accountsDatabase.data.get(id)
    if (!account) return err(new DatabaseError("AccountDoesNotExist"))

    if (empty === "currencies" || empty === "all") account.currencies.clear()
    if (empty === "inventory" || empty === "all") account.inventory.clear()

    const [error] = await accountsDatabase.save()
    if (error) return err(error)

    return ok(Object.freeze(account)) 
}

export async function getAccountsWithCurrency(currencyId: string) {
    const accountsWithCurrency = new Map<Snowflake, Account>()
    accountsDatabase.data.forEach((account: Account, id: Snowflake) => {
        if (account.currencies.has(currencyId)) accountsWithCurrency.set(id, account)
    })
    return Object.freeze(accountsWithCurrency)
    
}

export async function takeCurrencyFromAccounts(currencyId: string) {
    const accountsWithCurrency = await getAccountsWithCurrency(currencyId)
    accountsWithCurrency.forEach(async (account: Account) => {
        account.currencies.delete(currencyId)
    })

    const [error] = await accountsDatabase.save()
    if (error) return err(error)

    return ok(Object.freeze(accountsWithCurrency))
}