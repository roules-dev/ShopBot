import { nanoIdSchema } from "@/schemas/utils.js"
import z from "zod"
import { productActions } from "../data/product-actions/index.js"

export const productActionSchema = z.discriminatedUnion("kind", [
    productActions["give-currency"].schema,
    productActions["give-role"].schema,
])

export const productActionSchemaKinds = z.union(
    productActionSchema.options.map(option => 
        z.literal((option.shape.kind).value)
    )
)

export const productRawSchema = z.object({
    itemId: nanoIdSchema,
    price: z.record(
        nanoIdSchema, 
        z.number().positive()
    ),
    stock: z.exactOptional(z.nullable(z.number().min(0))),
    
    action: z.exactOptional(z.nullable(productActionSchema))
})
