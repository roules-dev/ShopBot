import { JsonDatabase } from "@/database/json-database.js";
import { accountRawSchema } from "@/features/accounts/schemas/accounts.schemas.js";
import { currencyRawSchema } from "@/features/currencies/schemas/currencies.schemas.js";
import { itemRawSchema } from "@/features/items/schemas/items.schemas.js";
import { shopRawSchema } from "@/features/shops/schemas/shop.schemas.js";
import { nanoIdSchema, snowflakeSchema } from "@/schemas/utils.js";

export type CurrenciesDatabase = JsonDatabase<typeof nanoIdSchema, typeof currencyRawSchema>
export type ItemsDatabase = JsonDatabase<typeof nanoIdSchema, typeof itemRawSchema>
export type ShopsDatabase = JsonDatabase<typeof nanoIdSchema, typeof shopRawSchema>
export type AccountsDatabase = JsonDatabase<typeof snowflakeSchema, typeof accountRawSchema>
