import { Database, DatabaseJSONBody, NanoId } from "@/database/database-types.js"
import { ok } from "@/lib/error-handling.js"


export interface Currency {
    id: NanoId
    name: string
    emoji: string
}

export type CurrencyOptions = Omit<Currency, 'id'>
export type CurrencyOptionsOptional = Partial<CurrencyOptions>

export interface CurrenciesDatabaseJSONBody extends DatabaseJSONBody {
    [currencyId: NanoId]: Currency
}


export class CurrenciesDatabase extends Database {
    public currencies: Map<NanoId, Currency>

    public constructor (databaseRaw: CurrenciesDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        const [error, currencies] = this.parseRaw(databaseRaw)
        if (error) throw error

        this.currencies = currencies
    }

    public toJSON(): CurrenciesDatabaseJSONBody {
        const currencies: CurrenciesDatabaseJSONBody = Object.fromEntries(this.currencies)
        return currencies
    }

    protected parseRaw(databaseRaw: CurrenciesDatabaseJSONBody){
        return ok(new Map(Object.entries(databaseRaw)))
    }
}
