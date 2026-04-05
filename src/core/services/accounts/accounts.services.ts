import { accountsDatabase } from "@/core/database/init-databases.js";
import { NanoId } from "@/database/database-types.js";
import { dbGetAccountsWithCurrency, dbGetOrCreateAccount, dbUpdateAccount, dbUpdateBalance } from "@/features/accounts/database/accounts-database.js";
import { Account, AccountBalanceTypes } from "@/features/accounts/database/accounts-type.js";
import { Snowflake } from "discord.js";

export function getOrCreateAccount(id: Snowflake) {
    return dbGetOrCreateAccount(accountsDatabase, id)
}

export function getAccountsWithCurrency(currencyId: string) {
    return dbGetAccountsWithCurrency(accountsDatabase, currencyId)
}

export function updateAccount(id: Snowflake, options: Partial<Account>) {
    return dbUpdateAccount(accountsDatabase, id, options)
}

export function updateBalance<T extends keyof AccountBalanceTypes>(
    id: Snowflake, 
    balanceType: T, 
    itemId: NanoId, 
    newBalance: AccountBalanceTypes[T]
) {
    return dbUpdateBalance(accountsDatabase, id, balanceType, itemId, newBalance)
}
