import { NanoIdSchema, SnowflakeSchema } from "@/schemas/utils.js"
import z from "zod"

export const SHOP_NAME_MAX_LENGTH = 120
export const SHOP_DESCRIPTION_MAX_LENGTH = 480

export const DISCOUNT_CODE_MIN_LENGTH = 6
export const DISCOUNT_CODE_MAX_LENGTH = 8

export const ProductActionSchema = z.discriminatedUnion("type", [
    z.object({ 
        type: z.literal("give-role"),
        options: z.object({
            roleId: SnowflakeSchema
        })
    }),
    z.object({
        type: z.literal("give-currency"),
        options: z.object({
            currencyId: NanoIdSchema,
            amount: z.number().min(0)
        })
    })
])


export const ProductRawSchema = z.object({
    itemId: NanoIdSchema,
    price: z.record(
        NanoIdSchema, 
        z.number().min(0)
    ),
    stock: z.exactOptional(z.nullable(z.number().min(0))),
    
    action: z.exactOptional(z.nullable(ProductActionSchema))
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

    reservedTo: z.exactOptional(z.nullable(SnowflakeSchema)),

    products: z.record( 
        NanoIdSchema, 
        ProductRawSchema
    )
})

export type ShopRaw = z.infer<typeof ShopRawSchema>