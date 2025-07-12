import { nanoid } from 'nanoid';
import currencies from '../../../data/currencies.json';
import { save } from "../database-handler";
import { DatabaseError} from "../database-types";
import { CurrenciesDatabase, Currency, CurrencyOptionsOptional } from "./currencies-types";

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
    if (currenciesDatabase.currencies.has(getCurrencyId(currencyName) || '')) throw new DatabaseError("CurrencyAlreadyExists")
    
    const newCurrencyId = nanoid()

    currenciesDatabase.currencies.set(newCurrencyId, { id: newCurrencyId, name: currencyName, emoji })
    await save(currenciesDatabase)

    return currenciesDatabase.currencies.get(newCurrencyId)!
}

export async function removeCurrency(currencyId: string) {
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError("CurrencyDoesNotExist")

    currenciesDatabase.currencies.delete(currencyId)
    save(currenciesDatabase)
}

export async function updateCurrency(currencyId: string, options: CurrencyOptionsOptional) {
    if (!currenciesDatabase.currencies.has(currencyId)) throw new DatabaseError("CurrencyDoesNotExist")
    
    const { name, emoji } = options

    const currency = currenciesDatabase.currencies.get(currencyId)!

    if (name) currency.name = name
    if (emoji) currency.emoji = emoji

    await save(currenciesDatabase)
}



export function getCurrenciesJSON() {
    return currenciesDatabase.toJSON()
}