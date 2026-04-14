import z from "zod"
import { AccountRawSchema } from "../schemas/accounts.schemas.js"

export type Account = z.infer<typeof AccountRawSchema>
