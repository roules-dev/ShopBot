import { ApiError } from "@/database/database-types.js"
import { CurrenciesDatabase, CurrencyOptions } from "@/features/currencies/database/currencies-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { Exact } from "@/lib/types/index.js"
import { nanoid } from "nanoid"



export function dbGetCurrencyId(db: CurrenciesDatabase, currencyName: string) {
    let currencyId: string | undefined = undefined
    db.list().forEach(currency => {
        if (currency.name == currencyName) currencyId = currency.id
    })
    return currencyId 
}

export async function dbCreateCurrency<T extends CurrencyOptions>(db: CurrenciesDatabase, options: Exact<T, CurrencyOptions>) {
    if (dbGetCurrencyId(db, options.name) != undefined) return err(new ApiError("CurrencyAlreadyExists"))
    
    const newCurrencyId = nanoid()
    const newCurrency = { id: newCurrencyId, ...options }

    db.set(newCurrencyId, newCurrency)
    const [error] = await db.save()
    if (error) return err(error)

    return ok(newCurrency)
}

export async function dbRemoveCurrency(db: CurrenciesDatabase, currencyId: string) {
    if (!db.get(currencyId)) return err(new ApiError("CurrencyDoesNotExist"))

    db.delete(currencyId)
    const [error] = await db.save()
    if (error) return err(error)

    return ok(true)
}

export async function dbUpdateCurrency(db: CurrenciesDatabase, currencyId: string, options: Partial<CurrencyOptions>) {  
    const currency = db.get(currencyId)
    
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))
    
    const [error1, updated] = await db.patch(currencyId, options)
    if (error1) return err(error1)

    const [error2] = await db.save()
    if (error2) return err(error2)

    return ok(updated)
}

