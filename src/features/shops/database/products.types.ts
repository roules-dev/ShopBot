import z from "zod"
import { ProductRawSchema, ProductActionSchema } from "../schemas/products.schemas.js"

export type Product = z.infer<typeof ProductRawSchema>

// TODO : if price is an empty array -> item is free -> must add a string to locales.

export type ProductAction = z.infer<typeof ProductActionSchema>
export type ProductActionType = ProductAction["type"]