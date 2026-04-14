import z from "zod"
import { ShopRawSchema } from "../schemas/shop.schemas.js"

export type Shop = z.infer<typeof ShopRawSchema>

export type ShopOptions = Omit<Shop, "products" | "discountCodes">

