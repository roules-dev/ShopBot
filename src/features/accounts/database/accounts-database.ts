import accounts from "@/../data/accounts.json" with { type: "json" }
import { ApiError, NanoId } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { Account, AccountBalanceTypes, AccountsDatabase } from "@/features/accounts/database/accounts-type.js"
import { err, ok } from "@/lib/error-handling.js"
import { Snowflake } from "discord.js"

const accountsDatabase = new AccountsDatabase(accounts, "data/accounts.json")

export async function getOrCreateAccount(db = accountsDatabase, id: Snowflake) {
    let account = db.data.get(id)

    if (!account) {
        db.data.set(id, { currencies: new Map(), inventory: new Map() })

        const [error] = await db.save()
        if (error) return err(error)

        account = db.data.get(id)!
    }

    return ok(account)
}


export function getAccountsWithCurrency(db = accountsDatabase, currencyId: string) {
    const accountsWithCurrency = new Map<Snowflake, Account>()
    db.data.forEach((account: Account, id: Snowflake) => {
        if (account.currencies.has(currencyId)) accountsWithCurrency.set(id, account)
    })
    return accountsWithCurrency
}

export async function updateAccount(db = accountsDatabase, id: Snowflake, options: Partial<Account>) {
    const account = db.data.get(id)
    if (!account) return err(new ApiError("AccountDoesNotExist"))
    
    update(account, options)

    const [error] = await db.save()
    if (error) return err(error)

    return ok(account)
}


export async function updateBalance<T extends keyof AccountBalanceTypes>(
    db = accountsDatabase, 
    id: Snowflake, 
    balanceType: T, 
    itemId: NanoId, 
    newBalance: AccountBalanceTypes[T]
) {
    const account = db.data.get(id)
    if (!account) return err(new ApiError("AccountDoesNotExist"))

    account[balanceType].set(itemId, newBalance)

    const [error] = await db.save()
    if (error) return err(error)

    return ok(account)
}
