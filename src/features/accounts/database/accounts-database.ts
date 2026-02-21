import accounts from '@/../data/accounts.json' with { type: 'json' }
import { DatabaseError } from '@/database/database-types.js'
import { getCurrencies } from '@/features/currencies/database/currencies-database.js'
import { Snowflake } from "discord.js"
import { Account, AccountsDatabase } from "@/features/accounts/database/accounts-type.js"
import { Product } from '@/features/shops/database/products-types.js'
import { err, ok } from '@/lib/error-handling.js'

const accountsDatabase = new AccountsDatabase(accounts, 'data/accounts.json')

export async function getOrCreateAccount(id: Snowflake): Promise<Account> {
    let account = accountsDatabase.data.get(id)

    if (!account) {
        accountsDatabase.data.set(id, { currencies: new Map(), inventory: new Map() })
        await accountsDatabase.save()
        account = accountsDatabase.data.get(id)!
    }

    return account
}

export async function setAccountCurrencyAmount(id: Snowflake, currencyId: string, amount: number) {
    const account = await getOrCreateAccount(id)
    
    if (!getCurrencies().has(currencyId)) return err(new DatabaseError("CurrencyDoesNotExist"))

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
    return ok(account)
}

export async function setAccountItemAmount(id: Snowflake, product: Product, amount: number) {
    const account = await getOrCreateAccount(id)
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

    await accountsDatabase.save()
}

export async function emptyAccount(id: Snowflake, empty: 'currencies' | 'inventory' | 'all') {
    const account = accountsDatabase.data.get(id)
    if (!account) return err(new DatabaseError("AccountDoesNotExist"))

    if (empty === 'currencies' || empty === 'all') account.currencies.clear()
    if (empty === 'inventory' || empty === 'all') account.inventory.clear()

    await accountsDatabase.save()
    return ok(account) // could be ok(true) ?
}

export async function getAccountsWithCurrency(currencyId: string) {
    const accountsWithCurrency = new Map<Snowflake, Account>()
    accountsDatabase.data.forEach((account: Account, id: Snowflake) => {
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
