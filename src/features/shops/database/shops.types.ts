import z from "zod"
import { shopRawSchema } from "../schemas/shop.schemas.js"

export type Shop = z.infer<typeof shopRawSchema>

export type ShopOptions = Omit<Shop, "products" | "discountCodes">

