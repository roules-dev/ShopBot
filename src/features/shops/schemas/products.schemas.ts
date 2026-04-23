import { NanoIdSchema } from "@/schemas/utils.js"
import z from "zod"
import { productActions } from "../data/product-actions/index.js"

export const productActionSchema = z.discriminatedUnion("kind", [
    productActions["give-currency"].schema,
    productActions["give-role"].schema,
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
