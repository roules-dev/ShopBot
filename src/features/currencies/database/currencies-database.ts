import { CurrenciesDatabase } from "@/core/database/database.types.js"
import { ApiError } from "@/database/database-types.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { Exact } from "@/lib/types/index.js"
import { BrandedNanoId } from "@/schemas/utils.js"
import { nanoid } from "nanoid"




export function dbHasCurrencyWithName(db: CurrenciesDatabase, currencyName: string) {
    for (const [_id, currency] of db.list()) {
        if (currency.name === currencyName) {
            return true
        }
    }
    return false
}

export async function dbCreateCurrency<T extends Currency>(db: CurrenciesDatabase, options: Exact<T, Currency>) {
    if (dbHasCurrencyWithName(db, options.name)) return err(new ApiError("CurrencyAlreadyExists"))
    
    const newCurrencyId = nanoid<BrandedNanoId>()
    const newCurrency = { id: newCurrencyId, ...options }

    const [error] = await db.set(newCurrencyId, newCurrency)
    if (error) return err(error)

    return ok(newCurrency)
}

export async function dbRemoveCurrency(db: CurrenciesDatabase, currencyId: BrandedNanoId) {
    if (!db.get(currencyId)) return err(new ApiError("CurrencyDoesNotExist"))

    const [error] = await db.delete(currencyId)
    if (error) return err(error)

    return ok(true)
}

export async function dbUpdateCurrency(db: CurrenciesDatabase, currencyId: BrandedNanoId, options: Partial<Currency>) {  
    const currency = db.get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))
    
    const [error, updated] = await db.patch(currencyId, options)
    if (error) return err(error)

    return ok(updated)
}

