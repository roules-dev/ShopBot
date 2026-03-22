import { Database2 } from "@/database/database-types.js";
import { AccountRawSchema } from "@/features/accounts/schemas/accounts-schemas.js";
import { CurrencyRawSchema } from "@/features/currencies/schemas/currencies-schemas.js";
import { ItemRawSchema } from "@/features/items/schemas/items-schemas.js";
import { ShopRawSchema } from "@/features/shops/schemas/shop-schemas.js";
import { NanoIdSchema } from "@/schemas/utils.js";


export class Hydrator {
    constructor(
        private currenciesDb: Database2<typeof NanoIdSchema, typeof CurrencyRawSchema>,
        private itemsDb: Database2<typeof NanoIdSchema, typeof ItemRawSchema>,
        private shopsDb: Database2<typeof NanoIdSchema, typeof ShopRawSchema>,
        private accountsDb: Database2<typeof NanoIdSchema, typeof AccountRawSchema>
    ) {}

    
}