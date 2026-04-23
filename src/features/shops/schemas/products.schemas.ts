import { NanoIdSchema } from "@/schemas/utils.js"
import z from "zod"
import { giveCurrencyActionSchema } from "../data/product-actions/give-currency.js"
import { giveRoleActionSchema } from "../data/product-actions/give-role.js"

export const productActionSchema = z.discriminatedUnion("kind", [
    giveCurrencyActionSchema,
    giveRoleActionSchema,
])


export const ProductRawSchema = z.object({
    itemId: NanoIdSchema,
    price: z.record(
        NanoIdSchema, 
        z.number().min(0)
    ),
    stock: z.exactOptional(z.nullable(z.number().min(0))),
    
    action: z.exactOptional(z.nullable(productActionSchema))
})
