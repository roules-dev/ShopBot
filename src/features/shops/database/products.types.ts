import z from "zod"
import { productRawSchema } from "../schemas/products.schemas.js"

export type Product = z.infer<typeof productRawSchema>
