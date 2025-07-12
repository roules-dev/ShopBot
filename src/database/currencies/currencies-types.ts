import { Database, DatabaseJSONBody, Id } from "../database-types"

export interface Currency {
    id: Id
    name: string
    emoji: string
}

export type CurrencyOptions = Omit<Currency, 'id'>
export type CurrencyOptionsOptional = Partial<CurrencyOptions>

export interface CurrenciesDatabaseJSONBody extends DatabaseJSONBody {
    [currencyId: Id]: Currency
}


export class CurrenciesDatabase extends Database {
    public currencies: Map<Id, Currency>

    public constructor (databaseRaw: CurrenciesDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.currencies = this.parseRaw(databaseRaw)
    }

    public toJSON(): CurrenciesDatabaseJSONBody {
        const currencies: CurrenciesDatabaseJSONBody = Object.fromEntries(this.currencies)
        return currencies
    }

    protected parseRaw(databaseRaw: CurrenciesDatabaseJSONBody): Map<Id, Currency> {
        return new Map(Object.entries(databaseRaw))
    }
}
