import { JsonDatabase } from "@/database/database-types.js";
import { AccountRawSchema } from "@/features/accounts/schemas/accounts-schemas.js";
import { CurrencyRawSchema } from "@/features/currencies/schemas/currencies-schemas.js";
import { ItemRawSchema } from "@/features/items/schemas/items-schemas.js";
import { ShopRawSchema } from "@/features/shops/schemas/shop-schemas.js";
import { NanoIdSchema, SnowflakeSchema } from "@/schemas/utils.js";

export type CurrenciesDatabase = JsonDatabase<typeof NanoIdSchema, typeof CurrencyRawSchema>
export type ItemsDatabase = JsonDatabase<typeof NanoIdSchema, typeof ItemRawSchema>
export type ShopsDatabase = JsonDatabase<typeof NanoIdSchema, typeof ShopRawSchema>
export type AccountsDatabase = JsonDatabase<typeof SnowflakeSchema, typeof AccountRawSchema>
