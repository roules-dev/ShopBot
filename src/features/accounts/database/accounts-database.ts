import accounts from "@/../data/accounts.json" with { type: "json" }
import { ApiError, NanoId } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { Account, AccountBalanceTypes, AccountsDatabase } from "@/features/accounts/database/accounts-type.js"
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

    return ok(account)
}


export function getAccountsWithCurrency(currencyId: string) {
    const accountsWithCurrency = new Map<Snowflake, Account>()
    accountsDatabase.data.forEach((account: Account, id: Snowflake) => {
        if (account.currencies.has(currencyId)) accountsWithCurrency.set(id, account)
    })
    return accountsWithCurrency
    
}

export async function updateAccount(id: Snowflake, options: Partial<Account>) {
    const account = accountsDatabase.data.get(id)
    if (!account) return err(new ApiError("AccountDoesNotExist"))
    
    update(account, options)

    const [error] = await accountsDatabase.save()
    if (error) return err(error)

    return ok(account)
}


export async function updateBalance<T extends keyof AccountBalanceTypes>(
    id: Snowflake, 
    balanceType: T, 
    itemId: NanoId, 
    newBalance: AccountBalanceTypes[T]
) {
    const account = accountsDatabase.data.get(id)
    if (!account) return err(new ApiError("AccountDoesNotExist"))

    account[balanceType].set(itemId, newBalance)

    const [error] = await accountsDatabase.save()
    if (error) return err(error)

    return ok(account)
}
