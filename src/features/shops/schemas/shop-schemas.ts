import { NanoIdSchema, SnowflakeSchema } from "@/schemas/utils.js"
import z from "zod"

export const SHOP_NAME_MAX_LENGTH = 120
export const SHOP_DESCRIPTION_MAX_LENGTH = 480

export const DISCOUNT_CODE_MIN_LENGTH = 6
export const DISCOUNT_CODE_MAX_LENGTH = 8

export const ProductRawSchema = z.object({
    price: z.record(
        NanoIdSchema, 
        z.number().min(0)
    ),
    stock: z.optional(z.number().min(0))
})


export const ShopRawSchema = z.object({
    name: z.string()
        .min(1)
        .max(SHOP_NAME_MAX_LENGTH),

    emoji: z.nullable(z.string()),

    description: z.nullable(z.string()
        .min(1)
        .max(SHOP_DESCRIPTION_MAX_LENGTH)
    ),

    discountCodes: z.record(
        z.string()
            .min(DISCOUNT_CODE_MIN_LENGTH)
            .max(DISCOUNT_CODE_MAX_LENGTH), 
        z.number().min(0)
    ),

    reservedTo: z.optional(SnowflakeSchema),

    products: z.record( 
        NanoIdSchema, 
        ProductRawSchema
    )
})
