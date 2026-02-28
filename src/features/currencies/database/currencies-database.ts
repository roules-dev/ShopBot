import currencies from "@/../data/currencies.json" with { type: "json" }
import { DatabaseError } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { CurrenciesDatabase, Currency, CurrencyOptionsOptional } from "@/features/currencies/database/currencies-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { nanoid } from "nanoid"


const currenciesDatabase = new CurrenciesDatabase(currencies, "data/currencies.json")

export function getCurrencies(): Map<string, Currency> {
    return Object.freeze(currenciesDatabase.data)
}

export function getCurrencyId(currencyName: string): string | undefined {
    let currencyId: string | undefined = undefined
    currenciesDatabase.data.forEach(currency => {
        if (currency.name == currencyName) currencyId = currency.id
    })
    return currencyId 
}

export async function createCurrency(currencyName: string, emoji: string) {
    if (getCurrencyId(currencyName) != undefined) return err(new DatabaseError("CurrencyAlreadyExists"))
    
    const newCurrencyId = nanoid()
    const newCurrency = { id: newCurrencyId, name: currencyName, emoji }

    currenciesDatabase.data.set(newCurrencyId, newCurrency)
    const [error] = await currenciesDatabase.save()
    if (error) return err(error)

    return ok(Object.freeze(newCurrency))
}

export async function removeCurrency(currencyId: string) {
    if (!currenciesDatabase.data.has(currencyId)) return err(new DatabaseError("CurrencyDoesNotExist"))

    currenciesDatabase.data.delete(currencyId)
    const [error] = await currenciesDatabase.save()
    if (error) return err(error)

    return ok(true)
}

export async function updateCurrency(currencyId: string, options: CurrencyOptionsOptional) {  
    const currency = currenciesDatabase.data.get(currencyId)
    
    if (!currency) return err(new DatabaseError("CurrencyDoesNotExist"))
    
    update(currency, options)

    const [error] = await currenciesDatabase.save()
    if (error) return err(error)

    return ok(Object.freeze(currency))
}

