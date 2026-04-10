import { AccountsDatabase } from "@/core/database/database.types.js"
import { ApiError, NanoId } from "@/database/database-types.js"
import { Account } from "@/features/accounts/database/accounts-type.js"
import { err, ok } from "@/lib/error-handling.js"
import { DeepReadonly } from "@/lib/types/readonly.js"
import { BrandedSnowflake } from "@/schemas/utils.js"


export async function dbGetOrCreateAccount(db: AccountsDatabase, id: BrandedSnowflake) {
    let account = db.get(id)

    if (!account) {
        const [error, created] = await db.set(id, { currencies: {}, inventory: {} })
        if (error) return err(error)

        account = created
    }

    return ok(account)
}


export function dbGetAccountsWithCurrency(db: AccountsDatabase, currencyId: NanoId) {
    const accountsWithCurrency = new Map<BrandedSnowflake, DeepReadonly<Account>>()
    db.list().forEach((account, id) => {
        if (Object.keys(account.currencies).includes(currencyId)) accountsWithCurrency.set(id, account)
    })
    return accountsWithCurrency
}

export async function dbUpdateAccount(db: AccountsDatabase, id: BrandedSnowflake, options: Partial<Account>) {
    const account = db.get(id)
    if (!account) return err(new ApiError("AccountDoesNotExist"))
    
    const [error1, updated] = await db.patch(id, options)
    if (error1) return err(error1)

    return ok(updated)
}


export async function dbUpdateBalance<T extends keyof Account>(
    db: AccountsDatabase, 
    id: BrandedSnowflake, 
    balanceType: T, 
    itemId: NanoId, 
    newAmount: number
) {
    const account = db.get(id)
    if (!account) return err(new ApiError("AccountDoesNotExist"))

    const [error1, updated] = await db.update(id, draft => {
        draft[balanceType] = {
            ...draft[balanceType],
            [itemId]: newAmount
        }
    })

    if (error1) return err(error1)

    return ok(updated)
}
