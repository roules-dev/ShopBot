import accounts from '@/../data/accounts.json' with { type: 'json' }; // maybe to be refactored (absolute path or something, alias ??)
import { DatabaseError, DatabaseErrors } from '@/database/database-types.js';
import { getCurrencies } from '@/features/currencies/database/currencies-database.js';
import { Product } from '@/features/shops/database/shops-types.js';
import { Snowflake } from "discord.js";
import { Account, AccountsDatabase } from "./accounts-type.js";

const accountsDatabase = new AccountsDatabase(accounts, 'data/accounts.json')

export async function getOrCreateAccount(id: Snowflake): Promise<Account> {
    let account = accountsDatabase.accounts.get(id)

    if (!account) {
        accountsDatabase.accounts.set(id, { currencies: new Map(), inventory: new Map() })
        await accountsDatabase.save()
        account = accountsDatabase.accounts.get(id)!
    }

    return account
}

export async function setAccountCurrencyAmount(id: Snowflake, currencyId: string, amount: number) {
    const account = await getOrCreateAccount(id)
    
    if (!getCurrencies().has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)

    const currencyBalance = account.currencies.get(currencyId)

    if (!currencyBalance) {
        const currency = getCurrencies().get(currencyId)!
        account.currencies.set(currencyId, 
            { 
                item: { 
                    id: currencyId, 
                    name: currency.name,
                    emoji: currency.emoji
                }, 
                amount: +amount.toFixed(2)
            }
        )
    } else {
        currencyBalance.amount = +amount.toFixed(2)
    }

    await accountsDatabase.save()
}

export async function setAccountItemAmount(id: Snowflake, product: Product, amount: number) {
    const account = await getOrCreateAccount(id)
    let productBalance = account.inventory.get(product.id)

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

    await accountsDatabase.save()
}

export async function emptyAccount(id: Snowflake, empty: 'currencies' | 'inventory' | 'all') {
    const account = accountsDatabase.accounts.get(id)
    if (!account) throw new DatabaseError(DatabaseErrors.AccountDoesNotExist)

    if (empty === 'currencies' || empty === 'all') account.currencies.clear()
    if (empty === 'inventory' || empty === 'all') account.inventory.clear()

    await accountsDatabase.save()
}

export async function getAccountsWithCurrency(currencyId: string) {
    const accountsWithCurrency = new Map<Snowflake, Account>()
    accountsDatabase.accounts.forEach((account: Account, id: Snowflake) => {
        if (account.currencies.has(currencyId)) accountsWithCurrency.set(id, account)
    })
    return accountsWithCurrency
    
}

export async function takeCurrencyFromAccounts(currencyId: string) {
    const accountsWithCurrency = await getAccountsWithCurrency(currencyId)
    accountsWithCurrency.forEach(async (account: Account) => {
        account.currencies.delete(currencyId)
    })

    await accountsDatabase.save()
    return accountsWithCurrency
}
