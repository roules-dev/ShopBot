import { nanoIdSchema } from "@/schemas/utils.js"
import z from "zod"
import { giveCurrencyActionSchema } from "../data/product-actions/give-currency.js"
import { giveRoleActionSchema } from "../data/product-actions/give-role.js"

export const productActionSchema = z.discriminatedUnion("kind", [
    giveCurrencyActionSchema,
    giveRoleActionSchema,
])


export const productRawSchema = z.object({
    itemId: nanoIdSchema,
    price: z.record(
        nanoIdSchema, 
        z.number().positive()
    ),
    stock: z.exactOptional(z.nullable(z.number().min(0))),
    
    action: z.exactOptional(z.nullable(productActionSchema))
})
