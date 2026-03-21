import { ApiError } from "@/database/database-types.js"
import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Product } from "@/features/shops/database/products-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { Snowflake } from "discord.js"
import { getAccountsWithCurrency, updateAccount, updateBalance } from "../database/accounts-database.js"
import { Account } from "../database/accounts-type.js"

export async function setAccountCurrencyAmount(id: Snowflake, currencyId: string, amount: number) {
    const currency = getCurrencies().get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

    const newCurrencyBalance = { 
        item: currency, 
        amount: +amount.toFixed(2)
    }

    const [error, account] = await updateBalance(id, "currencies", currencyId, newCurrencyBalance)
    if (error) return err(error)

    return ok({ account, currency })
}

export async function setAccountItemAmount(id: Snowflake, product: Product, amount: number) {
    const newItemBalance = { 
        item: product, 
        amount: +amount.toFixed(2)
    }

    const [error, account] = await updateBalance(id, "currencies", product.id, newItemBalance)
    if (error) return err(error)

    return ok({ account, product })
}

export async function emptyAccount(id: Snowflake, empty: "currencies" | "inventory" | "all") {
    let updatedAccount: Partial<Account> = {}

    if (empty === "currencies" || empty === "all") {
        updatedAccount["currencies"] = new Map()
    }
    if (empty === "inventory" || empty === "all") {
        updatedAccount["inventory"] = new Map()
    }

    const [error, account] = await updateAccount(id, updatedAccount)
    if (error) return err(error)

    return ok(account) 
}

export async function takeCurrencyFromAccounts(currencyId: string) {
    const currency = getCurrencies().get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

    const accountsWithCurrency = getAccountsWithCurrency(currencyId)

    for (const [id] of accountsWithCurrency) {
        const [error] = await updateBalance(id, "currencies", currencyId, { item: currency, amount: 0 })
        if (error) return err(error)
    }


    return ok(accountsWithCurrency)
}