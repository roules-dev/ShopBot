import z from "zod"
import { CurrencyRawSchema } from "../schemas/currencies.schemas.js"

export type Currency = z.infer<typeof CurrencyRawSchema>
