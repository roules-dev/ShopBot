import { getAccountsWithCurrency, updateAccount, updateBalance } from "@/core/services/accounts/accounts.services.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { getItems } from "@/core/services/items/items.services.js"
import { ApiError, NanoId } from "@/database/database.types.js"
import { assertNeverReached, err, ok } from "@/lib/error-handling.js"
import { BrandedSnowflake } from "@/schemas/utils.js"
import { Account } from "../database/accounts.type.js"

export async function setAccountCurrencyAmount(id: BrandedSnowflake, currencyId: NanoId, amount: number) {
    const currency = getCurrencies().get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

    const [error, account] = await updateBalance(id, "currencies", currencyId, +amount.toFixed(2))
    if (error) return err(error)

    return ok({ account, currency })
}

export async function setAccountItemAmount(id: BrandedSnowflake, itemId: NanoId, amount: number) {
    const item = getItems().get(itemId)
    if (!item) return err(new ApiError("ItemDoesNotExist"))

    const [error, account] = await updateBalance(id, "inventory", itemId, +amount.toFixed(2))
    if (error) return err(error)

    return ok({ account, item: itemId })
}

export async function emptyAccount(id: BrandedSnowflake, empty: keyof Account | "all") {
    let updatedAccount: Partial<Account> = {}

    switch (empty) {
        case "currencies":
            updatedAccount.currencies = {}
            break
        case "inventory":
            updatedAccount.inventory = {}
            break
        case "all":
            updatedAccount = { currencies: {}, inventory: {} }
            break
        default:
            assertNeverReached(empty)
    }

    const [error, account] = await updateAccount(id, updatedAccount)
    if (error) return err(error)

    return ok(account) 
}

export async function takeCurrencyFromAccounts(currencyId: NanoId) {
    const currency = getCurrencies().get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

    const accountsWithCurrency = getAccountsWithCurrency(currencyId)

    for (const [id] of accountsWithCurrency) {
        const [error] = await updateBalance(id, "currencies", currencyId, 0)
        if (error) return err(error)
    }


    return ok(accountsWithCurrency)
}