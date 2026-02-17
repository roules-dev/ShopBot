import currencies from '@/../data/currencies.json' with { type: 'json' };
import { DatabaseError, DatabaseErrors } from '@/database/database-types.js';
import { nanoid } from 'nanoid';
import { CurrenciesDatabase, Currency, CurrencyOptionsOptional } from "@/features/currencies/database/currencies-types.js";
;

const currenciesDatabase = new CurrenciesDatabase(currencies, 'data/currencies.json')

export function getCurrencies(): Map<string, Currency> {
    return currenciesDatabase.currencies
}

export function getCurrencyId(currencyName: string): string | undefined {
    let currencyId: string | undefined = undefined
    currenciesDatabase.currencies.forEach(currency => {
        if (currency.name == currencyName) currencyId = currency.id
    })
    return currencyId 
}

export function getCurrencyName(currencyId: string | undefined): string | undefined {
    if (!currencyId) return undefined

    const currency = getCurrencies().get(currencyId)
    if (!currency) return undefined

    return `${currency.emoji != '' ? `${currency.emoji} ` : ''}${currency.name}`    
}

export async function createCurrency(currencyName: string, emoji: string) {
    if (currenciesDatabase.currencies.has(getCurrencyId(currencyName) || '')) throw new DatabaseError(DatabaseErrors.CurrencyAlreadyExists)
    
    const newCurrencyId = nanoid()

    currenciesDatabase.currencies.set(newCurrencyId, { id: newCurrencyId, name: currencyName, emoji })
    currenciesDatabase.save()
}

export async function removeCurrency(currencyId: string) {
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)

    currenciesDatabase.currencies.delete(currencyId)
    currenciesDatabase.save()
}

export async function updateCurrency(currencyId: string, options: CurrencyOptionsOptional) {  // TODO: to be refactored (if elses are horrible)
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)
    
    const { name, emoji } = options

    const currency = currenciesDatabase.currencies.get(currencyId)!

    if (name) currency.name = name
    if (emoji) currency.emoji = emoji

    await currenciesDatabase.save()
}

