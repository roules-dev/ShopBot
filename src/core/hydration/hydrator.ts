// import { Database2 } from "@/database/database-types.js";
// import { AccountRawSchema } from "@/features/accounts/schemas/accounts-schemas.js";
// import { CurrencyRawSchema } from "@/features/currencies/schemas/currencies-schemas.js";
// import { ItemRawSchema } from "@/features/items/schemas/items-schemas.js";
// import { ShopRawSchema } from "@/features/shops/schemas/shop-schemas.js";
// import { NanoIdSchema } from "@/schemas/utils.js";

// type CurrenciesDatabase = Database2<typeof NanoIdSchema, typeof CurrencyRawSchema>
// type ItemsDatabase = Database2<typeof NanoIdSchema, typeof ItemRawSchema>
// type ShopsDatabase = Database2<typeof NanoIdSchema, typeof ShopRawSchema>
// type AccountsDatabase = Database2<typeof NanoIdSchema, typeof AccountRawSchema>

// export class Hydrator {
//     private currenciesDb: CurrenciesDatabase
//     private itemsDb: ItemsDatabase
//     private shopsDb: ShopsDatabase
//     private accountsDb: AccountsDatabase

//     constructor(
//         currenciesDb: CurrenciesDatabase,
//         itemsDb: ItemsDatabase,
//         shopsDb: ShopsDatabase,
//         accountsDb: AccountsDatabase
//     ) {
//         this.currenciesDb = currenciesDb
//         this.itemsDb = itemsDb
//         this.shopsDb = shopsDb
//         this.accountsDb = accountsDb
//     }
// }