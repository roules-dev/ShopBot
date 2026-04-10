import z from "zod"
import { CurrencyRawSchema } from "../schemas/currencies-schemas.js"


export type Currency = z.infer<typeof CurrencyRawSchema>
// export interface CurrenciesDatabaseJsonBody extends DatabaseJsonBody {
//     [currencyId: NanoId]: Currency
// }


// export class CurrenciesDatabase extends DatabaseLegacy<NanoId, Currency> {
//     public toJSON(): CurrenciesDatabaseJsonBody {
//         const currencies: CurrenciesDatabaseJsonBody = Object.fromEntries(this.data)
//         return currencies
//     }

//     protected parseRaw(databaseRaw: CurrenciesDatabaseJsonBody){
//         return ok(new Map(Object.entries(databaseRaw)))
//     }
// }
