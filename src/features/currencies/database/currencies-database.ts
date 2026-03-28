import currencies from "@/../data/currencies.json" with { type: "json" }
import { ApiError } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { CurrenciesDatabase, Currency, CurrencyOptions } from "@/features/currencies/database/currencies-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { Exact } from "@/lib/types/index.js"
import { nanoid } from "nanoid"


const currenciesDatabase = new CurrenciesDatabase(currencies, "data/currencies.json")

export function getCurrencies(db = currenciesDatabase): Map<string, Currency> {
    return db.data
}

export function getCurrencyId(db = currenciesDatabase, currencyName: string): string | undefined {
    let currencyId: string | undefined = undefined
    db.data.forEach(currency => {
        if (currency.name == currencyName) currencyId = currency.id
    })
    return currencyId 
}

export async function createCurrency<T extends CurrencyOptions>(db = currenciesDatabase, options: Exact<T, CurrencyOptions>) {
    if (getCurrencyId(db, options.name) != undefined) return err(new ApiError("CurrencyAlreadyExists"))
    
    const newCurrencyId = nanoid()
    const newCurrency = { id: newCurrencyId, ...options }

    db.data.set(newCurrencyId, newCurrency)
    const [error] = await db.save()
    if (error) return err(error)

    return ok(newCurrency)
}

export async function removeCurrency(db = currenciesDatabase, currencyId: string) {
    if (!db.data.has(currencyId)) return err(new ApiError("CurrencyDoesNotExist"))

    db.data.delete(currencyId)
    const [error] = await db.save()
    if (error) return err(error)

    return ok(true)
}

export async function updateCurrency(db = currenciesDatabase, currencyId: string, options: Partial<CurrencyOptions>) {  
    const currency = db.data.get(currencyId)
    
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))
    
    update(currency, options)

    const [error] = await db.save()
    if (error) return err(error)

    return ok(currency)
}

