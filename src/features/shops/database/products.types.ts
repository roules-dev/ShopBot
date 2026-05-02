import z from "zod"
import { productRawSchema, productActionSchema } from "../schemas/products.schemas.js"

export type Product = z.infer<typeof productRawSchema>

export type ProductAction = z.infer<typeof productActionSchema> // Problem here
export type ProductActionType = ProductAction["kind"]