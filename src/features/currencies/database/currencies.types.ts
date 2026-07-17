import z from "zod"
import { currencyRawSchema } from "../schemas/currencies.schemas.js"

export type Currency = z.infer<typeof currencyRawSchema>
