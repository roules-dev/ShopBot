import { SnowflakeSchema } from "@/schemas/utils.js"
import z from "zod"


export const ProductRawSchema = z.object({
    price: z.record(
        z.nanoid(), 
        z.number().min(0)
    ),
    stock: z.number().min(0).optional() 
})


export const ShopRawSchema = z.object({
    name: z.string(), // must add validation for the length
    emoji: z.string(),
    description: z.string(),

    discountCodes: z.record(
        z.string(), 
        z.number().min(0)
    ),

    reservedTo: SnowflakeSchema.optional(),

    products: z.record(
        z.nanoid(), 
        ProductRawSchema
    )
})
