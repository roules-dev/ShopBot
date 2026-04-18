import { accountsDatabase } from "@/core/database/init-databases.js";
import { NanoId } from "@/database/database.types.js";
import { dbGetAccountsWithCurrency, dbGetOrCreateAccount, dbUpdateAccount, dbUpdateBalance } from "@/features/accounts/database/accounts.database.js";
import { Account } from "@/features/accounts/database/accounts.type.js";
import { BrandedSnowflake } from "@/schemas/utils.js";

export function getOrCreateAccount(id: BrandedSnowflake) {
    return dbGetOrCreateAccount(accountsDatabase, id)
}

export function getAccountsWithCurrency(currencyId: NanoId) {
    return dbGetAccountsWithCurrency(accountsDatabase, currencyId)
}

export function updateAccount(id: BrandedSnowflake, options: Partial<Account>) {
    return dbUpdateAccount(accountsDatabase, id, options)
}

export function updateBalance<T extends keyof Account>(
    id: BrandedSnowflake, 
    balanceType: T, 
    itemId: NanoId, 
    newAmount: number
) {
    return dbUpdateBalance(accountsDatabase, id, balanceType, itemId, newAmount)
}
