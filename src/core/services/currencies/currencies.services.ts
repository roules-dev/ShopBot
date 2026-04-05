import { currenciesDatabase } from "@/core/database/init-databases.js"
import { dbGetCurrencyId, dbCreateCurrency, dbRemoveCurrency, dbUpdateCurrency } from "@/features/currencies/database/currencies-database.js"
import { CurrencyOptions } from "@/features/currencies/database/currencies-types.js"
import { Exact } from "@/lib/types/constraints.js"

export function getCurrencies() {
    return currenciesDatabase.list()
}

export function getCurrencyId(currencyName: string) {
    return dbGetCurrencyId(currenciesDatabase, currencyName)
}

export function createCurrency<T extends CurrencyOptions>(
    options: Exact<T, CurrencyOptions>
) {
    return dbCreateCurrency(currenciesDatabase, options)
}

export function removeCurrency(currencyId: string) {
    return dbRemoveCurrency(currenciesDatabase, currencyId)
}

export function updateCurrency(
    currencyId: string,
    options: Partial<CurrencyOptions>
) {
    return dbUpdateCurrency(currenciesDatabase, currencyId, options)
}