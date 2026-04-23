import z from "zod"
import { ProductRawSchema, productActionSchema } from "../schemas/products.schemas.js"

export type Product = z.infer<typeof ProductRawSchema>

export type ProductAction = z.infer<typeof productActionSchema> // Problem here
export type ProductActionType = ProductAction["kind"]