import { EmojiSchema, NanoIdSchema, SnowflakeSchema } from "@/schemas/utils.js"
import z from "zod"
import { ProductRawSchema } from "./products.schemas.js"

export const SHOP_NAME_MAX_LENGTH = 120
export const SHOP_DESCRIPTION_MAX_LENGTH = 480

export const DISCOUNT_CODE_MIN_LENGTH = 6
export const DISCOUNT_CODE_MAX_LENGTH = 8

export const ShopRawSchema = z.object({
    name: z.string()
        .min(1)
        .max(SHOP_NAME_MAX_LENGTH),

    emoji: z.nullable(EmojiSchema),

    description: z.nullable(z.string()
        .min(1)
        .max(SHOP_DESCRIPTION_MAX_LENGTH)
    ),

    discountCodes: z.record(
        z.string()
            .min(DISCOUNT_CODE_MIN_LENGTH)
            .max(DISCOUNT_CODE_MAX_LENGTH), 
        z.number().min(0).max(100)
    ),

    reservedTo: z.exactOptional(z.nullable(SnowflakeSchema)),

    products: z.record( 
        NanoIdSchema, 
        ProductRawSchema
    )
})