import { currenciesDatabase } from "@/core/database/init-databases.js"
import { NanoId } from "@/database/database-types.js"
import { dbCreateCurrency, dbDeleteCurrency, dbUpdateCurrency } from "@/features/currencies/database/currencies-database.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { Exact } from "@/lib/types/constraints.js"

export function getCurrencies() {
    return currenciesDatabase.list()
}

export function createCurrency<T extends Currency>(
    options: Exact<T, Currency>
) {
    return dbCreateCurrency(currenciesDatabase, options)
}

export function deleteCurrency(currencyId: NanoId) {
    return dbDeleteCurrency(currenciesDatabase, currencyId)
}

export function updateCurrency(
    currencyId: NanoId,
    options: Partial<Currency>
) {
    return dbUpdateCurrency(currenciesDatabase, currencyId, options)
}