import { CurrenciesDatabase } from "@/core/database/database.types.js"
import { ApiError, NanoId } from "@/database/database.types.js"
import { Currency } from "@/features/currencies/database/currencies.types.js"
import { err, ok } from "@/lib/error-handling.js"
import { Exact } from "@/lib/types/index.js"
import { nanoid } from "nanoid"


export function dbHasCurrencyWithName(db: CurrenciesDatabase, currencyName: string) {
    for (const [_id, currency] of db.list()) {
        if (currency.name === currencyName) {
            return true
        }
    }
    return false
}

export async function dbCreateCurrency<T extends Currency>(db: CurrenciesDatabase, currency: Exact<T, Currency>) {
    if (dbHasCurrencyWithName(db, currency.name)) return err(new ApiError("CurrencyAlreadyExists"))
    
    const newCurrencyId = nanoid<NanoId>()

    const [error, createdCurrency] = await db.set(newCurrencyId, currency)
    if (error) return err(error)

    return ok(createdCurrency)
}

export async function dbDeleteCurrency(db: CurrenciesDatabase, currencyId: NanoId) {
    if (!db.get(currencyId)) return err(new ApiError("CurrencyDoesNotExist"))

    const [error] = await db.delete(currencyId)
    if (error) return err(error)

    return ok(true)
}

export async function dbUpdateCurrency(db: CurrenciesDatabase, currencyId: NanoId, options: Partial<Currency>) {  
    const currency = db.get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))
    
    const [error, updated] = await db.patch(currencyId, options)
    if (error) return err(error)

    return ok(updated)
}

