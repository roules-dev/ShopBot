import currencies from '@/../data/currencies.json' with { type: 'json' };
import { DatabaseError } from '@/database/database-types.js';
import { update } from '@/database/helpers.js';
import { CurrenciesDatabase, Currency, CurrencyOptionsOptional } from "@/features/currencies/database/currencies-types.js";
import { err, ok } from '@/lib/error-handling.js';
import { nanoid } from 'nanoid';
;

const currenciesDatabase = new CurrenciesDatabase(currencies, 'data/currencies.json')

export function getCurrencies(): Map<string, Currency> {
    return currenciesDatabase.data
}

export function getCurrencyId(currencyName: string): string | undefined {
    let currencyId: string | undefined = undefined
    currenciesDatabase.data.forEach(currency => {
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
    if (currenciesDatabase.data.has(getCurrencyId(currencyName) || '')) return err(new DatabaseError("CurrencyAlreadyExists"))
    
    const newCurrencyId = nanoid()
    const newCurrency = { id: newCurrencyId, name: currencyName, emoji }

    currenciesDatabase.data.set(newCurrencyId, newCurrency)
    currenciesDatabase.save()

    return ok(newCurrency)
}

export async function removeCurrency(currencyId: string) {
    if (!currenciesDatabase.data.has(currencyId)) return err(new DatabaseError("CurrencyDoesNotExist"))

    currenciesDatabase.data.delete(currencyId)
    currenciesDatabase.save()
    return ok(true)
}

export async function updateCurrency(currencyId: string, options: CurrencyOptionsOptional) {  
    if (!currenciesDatabase.data.has(currencyId)) return err(new DatabaseError("CurrencyDoesNotExist"))
    
    const currency = currenciesDatabase.data.get(currencyId)!

    update(currency, options)

    await currenciesDatabase.save()
    return ok(currency)
}

