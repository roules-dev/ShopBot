import { currenciesDatabase } from "@/core/database/init-databases.js"
import { dbCreateCurrency, dbRemoveCurrency, dbUpdateCurrency } from "@/features/currencies/database/currencies-database.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { Exact } from "@/lib/types/constraints.js"
import { BrandedNanoId } from "@/schemas/utils.js"

export function getCurrencies() {
    return currenciesDatabase.list()
}

export function createCurrency<T extends Currency>(
    options: Exact<T, Currency>
) {
    return dbCreateCurrency(currenciesDatabase, options)
}

export function removeCurrency(currencyId: BrandedNanoId) {
    return dbRemoveCurrency(currenciesDatabase, currencyId)
}

export function updateCurrency(
    currencyId: BrandedNanoId,
    options: Partial<Currency>
) {
    return dbUpdateCurrency(currenciesDatabase, currencyId, options)
}