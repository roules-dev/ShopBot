import { SnowflakeSchema, NanoIdSchema } from "@/schemas/utils.js"
import z from "zod"

export const ProductActionSchema = z.discriminatedUnion("kind", [
    z.object({ 
        kind: z.literal("give-role"),
        options: z.object({
            roleId: SnowflakeSchema
        })
    }),
    z.object({
        kind: z.literal("give-currency"),
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
