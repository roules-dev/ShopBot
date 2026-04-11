import z from "zod"
import { ProductRawSchema } from "../schemas/shop-schemas.js"

export type Product = z.infer<typeof ProductRawSchema>

// TODO : if price is an empty array -> item is free -> must add a string to locales.
