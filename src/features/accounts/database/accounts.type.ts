import z from "zod"
import { accountRawSchema } from "../schemas/accounts.schemas.js"

export type Account = z.infer<typeof accountRawSchema>
