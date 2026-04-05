import { ApiError, NanoId } from "@/database/database-types.js"
import { Account, AccountBalanceTypes, AccountsDatabase } from "@/features/accounts/database/accounts-type.js"
import { err, ok } from "@/lib/error-handling.js"
import { DeepReadonly } from "@/lib/types/readonly.js"
import { Snowflake } from "discord.js"


export async function dbGetOrCreateAccount(db: AccountsDatabase, id: Snowflake) {
    let account = db.get(id)

    if (!account) {
        db.set(id, { currencies: new Map(), inventory: new Map() })

        const [error] = await db.save()
        if (error) return err(error)

        account = db.get(id)!
    }

    return ok(account)
}


export function dbGetAccountsWithCurrency(db: AccountsDatabase, currencyId: string) {
    const accountsWithCurrency = new Map<Snowflake, DeepReadonly<Account>>()
    db.list().forEach((account, id) => {
        if (account.currencies.has(currencyId)) accountsWithCurrency.set(id, account)
    })
    return accountsWithCurrency
}

export async function dbUpdateAccount(db: AccountsDatabase, id: Snowflake, options: Partial<Account>) {
    const account = db.get(id)
    if (!account) return err(new ApiError("AccountDoesNotExist"))
    
    const [error1, updated] = await db.patch(id, options)
    if (error1) return err(error1)

    const [error2] = await db.save()
    if (error2) return err(error2)

    return ok(updated)
}


export async function dbUpdateBalance<T extends keyof AccountBalanceTypes>(
    db: AccountsDatabase, 
    id: Snowflake, 
    balanceType: T, 
    itemId: NanoId, 
    newBalance: AccountBalanceTypes[T]
) {
    const account = db.get(id)
    if (!account) return err(new ApiError("AccountDoesNotExist"))

    const [error1, updated] = await db.update(id, draft => {
        draft[balanceType].set(itemId, newBalance)
    })

    if (error1) return err(error1)

    const [error2] = await db.save()
    if (error2) return err(error2)

    return ok(updated)
}
