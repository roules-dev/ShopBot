import z from "zod"
import { ProductRawSchema, ProductActionSchema } from "../schemas/products.schemas.js"

export type Product = z.infer<typeof ProductRawSchema>

export type ProductAction = z.infer<typeof ProductActionSchema>
export type ProductActionType = ProductAction["type"]