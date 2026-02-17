import currencies from '@/../data/currencies.json' with { type: 'json' };
import { DatabaseError } from '@/database/database-types.js';
import { CurrenciesDatabase, Currency, CurrencyOptionsOptional } from "@/features/currencies/database/currencies-types.js";
import { err, ok } from '@/lib/error-handling.js';
import { nanoid } from 'nanoid';
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
    if (currenciesDatabase.currencies.has(getCurrencyId(currencyName) || '')) return err(new DatabaseError("CurrencyAlreadyExists"))
    
    const newCurrencyId = nanoid()
    const newCurrency = { id: newCurrencyId, name: currencyName, emoji }

    currenciesDatabase.currencies.set(newCurrencyId, newCurrency)
    currenciesDatabase.save()

    return ok(newCurrency)
}

export async function removeCurrency(currencyId: string) {
    if (!currenciesDatabase.currencies.has(currencyId)) return err(new DatabaseError("CurrencyDoesNotExist"))

    currenciesDatabase.currencies.delete(currencyId)
    currenciesDatabase.save()
    return ok(true)
}

export async function updateCurrency(currencyId: string, options: CurrencyOptionsOptional) {  
    if (!currenciesDatabase.currencies.has(currencyId)) return err(new DatabaseError("CurrencyDoesNotExist"))
    
    const { name, emoji } = options

    const currency = currenciesDatabase.currencies.get(currencyId)!

    // TODO: to be refactored (if elses are horrible)
    if (name) currency.name = name
    if (emoji) currency.emoji = emoji

    await currenciesDatabase.save()
    return ok(currency)
}

