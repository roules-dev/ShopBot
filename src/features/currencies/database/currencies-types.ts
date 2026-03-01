import { Database, DatabaseJSONBody, NanoId } from "@/database/database-types.js"
import { ok } from "@/lib/error-handling.js"

export interface Currency {
    id: NanoId
    name: string
    emoji?: string
}

export type CurrencyOptions = Omit<Currency, "id">
export type CurrencyOptionsOptional = Partial<CurrencyOptions>

export interface CurrenciesDatabaseJSONBody extends DatabaseJSONBody {
    [currencyId: NanoId]: Currency
}


export class CurrenciesDatabase extends Database<NanoId, Currency> {
    public toJSON(): CurrenciesDatabaseJSONBody {
        const currencies: CurrenciesDatabaseJSONBody = Object.fromEntries(this.data)
        return currencies
    }

    protected parseRaw(databaseRaw: CurrenciesDatabaseJSONBody){
        return ok(new Map(Object.entries(databaseRaw)))
    }
}
